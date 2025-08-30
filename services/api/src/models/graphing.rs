use serde_json::Value;

pub struct GraphingActions {}

impl GraphingActions {
    async fn create_entity() {}
    async fn update_entity() {}
    async fn delete_entity() {}
    async fn read_entity() {}

    async fn create_edge() {}
    async fn update_edge() {}
    async fn delete_edge() {}
    async fn read_edge() {}

    async fn transform() {}
}

fn dict_to_opencypher(value: &Value) -> String {
    let mut properties = "{".to_string();

    if let Some(obj) = value.as_object() {
        for (k, v) in obj {
            properties.push_str(&format!("{}: ", k));
            match v {
                Value::String(s) => properties.push_str(&format!("'{}', ", s)),
                Value::Object(obj) => {
                    if let Some(dropdown_value) = obj.get("value") {
                        properties.push_str(&format!("'{}', ", dropdown_value));
                    }
                }
                _ => properties.push_str(&format!("{}, ", v)),
            }
        }
    }

    if properties.ends_with(", ") {
        properties.truncate(properties.len() - 2);
    }
    properties.push('}');

    properties
}
