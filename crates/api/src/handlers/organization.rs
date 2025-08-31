use crate::{
    middleware::auth::AuthMiddleware,
    schemas::{
        Notification,
        organization::{Organization, UpdateOrganization},
    },
};
use common::db;
use common::errors::AppError;
use actix_web::{Result, delete, get, put};
use log::error;

#[get("/organizations/me")]
async fn get_my_organization_handler(
    auth: AuthMiddleware,
    pool: db::Database,
) -> Result<Organization, AppError> {
    sqlx::query_as!(
        Organization,
        "SELECT * FROM organizations WHERE id = $1",
        auth.org_id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            message: "We ran into an error fetching your organization information.",
        }
    })
}

#[put("/organizations/me")]
async fn update_my_organization_handler(
    auth: AuthMiddleware,
    body: UpdateOrganization,
    pool: db::Database,
) -> Result<Organization, AppError> {
    let body = body.into_inner().validate()?;

    if auth.user_type != "owner" {
        return Err(AppError {
            message: "Only organization owners can update organization details.",
        });
    }

    sqlx::query_as!(
        Organization,
        r#"
        UPDATE organizations 
        SET name = $1, description = $2, website = $3, contact_email = $4, mtime = NOW()
        WHERE id = $5 
        RETURNING *
        "#,
        body.name,
        body.description,
        body.website,
        body.contact_email,
        auth.org_id
    )
    .fetch_one(pool.as_ref())
    .await
    .map_err(|err| {
        error!("{err}");
        AppError {
            message: "We ran into an error updating your organization.",
        }
    })
}

#[delete("/organizations/me")]
async fn delete_my_organization_handler(
    auth: AuthMiddleware,
    pool: db::Database,
) -> Result<Notification, AppError> {
    if auth.user_type != "owner" {
        return Err(AppError {
            message: "Only organization owners can delete their organization.",
        });
    }

    let mut tx = pool.begin().await.map_err(|err| {
        error!("{err}");
        AppError {
            message: "We ran into an error starting the deletion transaction.",
        }
    })?;

    let user_count =
        sqlx::query_scalar!("SELECT COUNT(*) FROM users WHERE org_id = $1", auth.org_id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|err| {
                error!("{err}");
                AppError {
                    message: "We ran into an error checking organization users.",
                }
            })?;

    if user_count.unwrap_or(0) > 1 {
        return Err(AppError {
            message: "Cannot delete organization with multiple users. Please remove all other users first.",
        });
    }

    sqlx::query!("DELETE FROM organizations WHERE id = $1", auth.org_id)
        .execute(&mut *tx)
        .await
        .map_err(|err| {
            error!("{err}");
            AppError {
                message: "We ran into an error deleting your organization.",
            }
        })?;

    tx.commit().await.map_err(|err| {
        error!("{err}");
        AppError {
            message: "We ran into an error completing the deletion.",
        }
    })?;

    Ok(Notification {
        message: "Organization and associated account have been successfully deleted.",
    })
}
