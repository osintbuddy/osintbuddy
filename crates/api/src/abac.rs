use crate::schemas::user::User;
use chrono;
use common::errors::AppError;
use log::error;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::net::IpAddr;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessContext {
    pub user: User,
    pub resource_type: ResourceType,
    pub resource_id: i64,
    pub action: Action,
    pub ip_address: Option<IpAddr>,
    pub user_agent: Option<String>,
    pub resource_owner_id: Option<i64>,
    pub resource_visibility: Option<String>,
    pub resource_org_id: Option<i64>,
    pub org_max_graphs: i32,
    pub org_max_entities: i32,
    pub org_can_export: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ResourceType {
    Graph,
    Entity,
}

impl ResourceType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ResourceType::Graph => "graph",
            ResourceType::Entity => "entity",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Action {
    Create,
    Read,
    Update,
    Delete,
    Share,
    Export,
}

impl Action {
    pub fn as_str(&self) -> &'static str {
        match self {
            Action::Create => "create",
            Action::Read => "read",
            Action::Update => "update",
            Action::Delete => "delete",
            Action::Share => "share",
            Action::Export => "export",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessDecision {
    pub granted: bool,
    pub reason: String,
}

pub struct AbacEngine;

impl AbacEngine {
    pub fn new() -> Self {
        AbacEngine
    }

    pub async fn check_access(&self, context: &AccessContext, pool: &PgPool) -> AccessDecision {
        let decision = self.evaluate_policies(context, pool).await;

        if let Err(e) = self.log_access_attempt(context, &decision, pool).await {
            error!("Failed to log access attempt: {}", e);
        }

        decision
    }

    async fn evaluate_policies(&self, context: &AccessContext, pool: &PgPool) -> AccessDecision {
        if context.action == Action::Create {
            return self.check_create_access(context).await;
        }

        if let Some(resource_owner_id) = context.resource_owner_id {
            if context.user.id == resource_owner_id {
                return AccessDecision {
                    granted: true,
                    reason: "Owner access".to_string(),
                };
            }
        }

        if let Ok(shared_access) = self.check_shared_access(context, pool).await {
            if shared_access.granted {
                return shared_access;
            }
        }

        if let Ok(org_access) = self.check_organization_access(context).await {
            if org_access.granted {
                return org_access;
            }
        }

        AccessDecision {
            granted: false,
            reason: "Access denied".to_string(),
        }
    }

    async fn check_create_access(&self, context: &AccessContext) -> AccessDecision {
        match context.resource_type {
            ResourceType::Graph => {
                let current_count = self
                    .get_user_graph_count(context.user.id)
                    .await
                    .unwrap_or(0);
                if current_count >= context.org_max_graphs {
                    return AccessDecision {
                        granted: false,
                        reason: format!(
                            "Graph limit exceeded ({}/{})",
                            current_count, context.org_max_graphs
                        ),
                    };
                }
            }
            ResourceType::Entity => {
                let current_count = self
                    .get_user_entity_count(context.user.id)
                    .await
                    .unwrap_or(0);
                if current_count >= context.org_max_entities {
                    return AccessDecision {
                        granted: false,
                        reason: format!(
                            "Entity limit exceeded ({}/{})",
                            current_count, context.org_max_entities
                        ),
                    };
                }
            }
        }

        AccessDecision {
            granted: true,
            reason: "Create access granted".to_string(),
        }
    }

    async fn check_shared_access(
        &self,
        context: &AccessContext,
        pool: &PgPool,
    ) -> Result<AccessDecision, AppError> {
        let shared_access = sqlx::query_as::<_, (String, Option<chrono::DateTime<chrono::Utc>>)>(
            "SELECT access_level, expires_at FROM resource_shares 
             WHERE resource_type = $1 AND resource_id = $2 AND shared_with_user_id = $3 
             AND (expires_at IS NULL OR expires_at > NOW())",
        )
        .bind(context.resource_type.as_str())
        .bind(context.resource_id)
        .bind(context.user.id)
        .fetch_optional(pool)
        .await
        .map_err(|err| {
            error!("Database error checking shared access: {}", err);
            AppError {
                message: "Error checking shared access",
            }
        })?;

        if let Some(share) = shared_access {
            let access_level = &share.0;
            let granted = match context.action {
                Action::Read => true,
                Action::Update | Action::Delete => {
                    access_level == "write" || access_level == "admin"
                }
                Action::Share => access_level == "admin",
                Action::Export => context.org_can_export,
                Action::Create => false,
            };

            return Ok(AccessDecision {
                granted,
                reason: format!("Shared access ({})", access_level),
            });
        }

        Ok(AccessDecision {
            granted: false,
            reason: "No shared access found".to_string(),
        })
    }

    async fn check_organization_access(
        &self,
        context: &AccessContext,
    ) -> Result<AccessDecision, AppError> {
        if let (Some(user_org_id), Some(resource_org_id)) =
            (Some(context.user.org_id), context.resource_org_id)
        {
            if user_org_id == resource_org_id {
                let granted = match context.action {
                    Action::Read => true,
                    Action::Export => true, // Organization members can export by default
                    _ => false,
                };

                return Ok(AccessDecision {
                    granted,
                    reason: format!("Organization access (org_id: {})", user_org_id),
                });
            }
        }

        Ok(AccessDecision {
            granted: false,
            reason: "No organization access".to_string(),
        })
    }

    async fn get_user_graph_count(&self, _user_id: i64) -> Result<i32, AppError> {
        // In a real implementation, this would query the database
        // For now, we'll assume the count is checked at the application level
        Ok(0)
    }

    async fn get_user_entity_count(&self, _user_id: i64) -> Result<i32, AppError> {
        // In a real implementation, this would query the database
        // For now, we'll assume the count is checked at the application level
        Ok(0)
    }

    async fn log_access_attempt(
        &self,
        context: &AccessContext,
        decision: &AccessDecision,
        pool: &PgPool,
    ) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO access_logs (user_id, resource_type, resource_id, action, ip_address, user_agent, access_granted, access_reason) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
        )
        .bind(context.user.id)
        .bind(context.resource_type.as_str())
        .bind(context.resource_id)
        .bind(context.action.as_str())
        .bind(context.ip_address.as_ref().map(|ip| ip.to_string()))
        .bind(context.user_agent.as_ref())
        .bind(decision.granted)
        .bind(&decision.reason)
        .execute(pool)
        .await
        .map_err(|err| {
            error!("Failed to log access attempt: {}", err);
            AppError {
                message: "Failed to log access attempt",
            }
        })?;

        Ok(())
    }
}
