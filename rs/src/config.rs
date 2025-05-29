use confik::Configuration;

#[derive(Debug, Configuration)]
pub struct OSINTBuddyConfig {
    pub backend_addr: String,
    pub backend_port: u16,
    pub postgres_addr: String,
    pub postgres_user: String,
    pub postgres_db: String,
    pub postgres_port: u16,
    pub backend_cors: String,

    #[confik(secret)]
    pub postgres_password: String,
    
    #[confik(secret)]
    pub sqids_alphabet: String,
}

impl Default for OSINTBuddyConfig {
    fn default() -> OSINTBuddyConfig {
        OSINTBuddyConfig { 
          postgres_user: String::from("postgres"),
          postgres_db: String::from("app"),
          postgres_addr: String::from("127.0.0.1"),
          postgres_password: String::from("postgres"),
          postgres_port: 55432,
          backend_port: 48997,
          backend_addr: String::from("127.0.0.1"),
          backend_cors: String::from("http://localhost:5173"),
          sqids_alphabet: String::from("RQWMLGFATEYHDSIUKXNCOVZJPB")
        }
    }
}