# OSINTBuddy Backend

## About the Project
  The core of the backend is a FastAPI app running on Python 3.11.4.You can find the [backend dockerfile here](./backend.Dockerfile) and the [selenium provider here](./app/app/api/deps.py) among a few other things.


# Dependencies
#### **General purpose:**
- [fastapi](https://pypi.org/project/fastapi/0.97.0/)
- [SQLAlchemy](https://pypi.org/project/SQLAlchemy/2.0.16/)
- [tenacity](https://pypi.org/project/tenacity/)
- [colorama](https://pypi.org/project/colorama/)
- [pyfiglet](https://pypi.org/project/pyfiglet/0.8.post1/)
- [termcolor](https://pypi.org/project/termcolor/2.3.0/)

# Getting Started

  1. Clone the repo
      ```sh
      git clone --recurse-submodules https://github.com/jerlendds/osintbuddy.git
      # using ssh?
      # git clone --depth=1 --recurse-submodules git@github.com:jerlendds/osintbuddy.git 
      cd osintbuddy
      ```

  2. Setup your dev env/`venv` and install development dependencies. From the `osintbuddy` directory run:
      ```bash
      ./launcher bootstrap 
      ```

  3. Start the stack
      ```bash
      ./launcher start
      # restart the backend:     ./launcher restart backend
      # stop the backend:        ./launcher stop backend
      # kill the stack:          ./launcher kill
      # generate UI api client:   npm run client:gen (only works if the backend is running)
      ```
      - Frontend: [http://localhost:5173](http://localhost:5173)
      - Backend: [http://localhost:48997/](http://localhost:48997/)
      - Casdoor: [http://localhost:45910/](http://localhost:45910/)
