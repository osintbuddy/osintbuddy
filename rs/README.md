# Meet OSINTBuddy: The Rust Rewrite


## Development

1. Install
   ```bash
   cargo install sqlx-cli --no-default-features --features native-tls,postgres
   cargo install cargo-watch
   ```

2. Migrate db and build and start web server with watch
   ```bash
   docker compose up db
   sqlx migrate run
   # run and watch server
   cargo watch -q -c -w src/ -x run
   ```

3. Visit the app
   - frontend: http://localhost:5173
   - backend: http://localhost:48997/api
