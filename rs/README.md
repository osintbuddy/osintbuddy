# Meet OSINTBuddy: The Rust Rewrite

Welcome to the Rust backend! OSINTBuddy is a platform that helps you dig through the internet for information. Built with Rust and modern web technologies. Our goal is to help researchers, analysts, and security professionals gather, analyze, and visualize publicly available information from various sources. Originally built in Python, this Rust rewrite exists because one guy got tired of Python being slow and I decided to rewrite the entire thing. Now it's faster and crashes less *(hopefully)*. 

## Development

1. Install
   ```bash
   cargo install sqlx-cli --no-default-features --features native-tls,postgres
   cargo install cargo-watch
   ```

2. Migrate db and build and start web server with watch
   ```bash
   docker compose up db ui
   cd rs/
   sqlx migrate run
   # run and watch server
   cargo watch -q -c -w src/ -x run
   ```

3. Visit the app
   - frontend: http://localhost:5173
   - backend: http://localhost:48997/api
