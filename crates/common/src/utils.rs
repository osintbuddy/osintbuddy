use regex::Regex;

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
    if value_list.is_empty() { return String::new(); }
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

