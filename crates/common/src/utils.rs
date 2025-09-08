use regex::Regex;
use serde_json::{Map, Value};

pub fn dict_to_opencypher(value: &Value) -> String {
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

pub fn to_snake_case(name: &str) -> String {
    let name = to_camel_case(&name.replace('-', "_").replace('.', "_"));
    let re1 = Regex::new(r"(.)([A-Z][a-z]+)").unwrap();
    let name = re1.replace_all(&name, "${1}_${2}");
    let re2 = Regex::new(r"__([A-Z])").unwrap();
    let name = re2.replace_all(&name, "_${1}");
    let re3 = Regex::new(r"([a-z0-9])([A-Z])").unwrap();
    let name = re3.replace_all(&name, "${1}_${2}");
    name.to_lowercase()
}

pub fn to_camel_case(value: &str) -> String {
    let value = value.replace(' ', "_");
    let value = value.to_lowercase();
    let value_list: Vec<&str> = value.split('_').collect();
    if value_list.is_empty() {
        return String::new();
    }
    let mut result = value_list[0].to_string();
    for part in &value_list[1..] {
        if !part.is_empty() {
            let mut chars = part.chars();
            if let Some(first) = chars.next() {
                result.push(first.to_uppercase().next().unwrap_or(first));
                result.push_str(&chars.collect::<String>());
            }
        }
    }
    result
}

