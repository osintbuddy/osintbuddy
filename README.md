[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![Total Downloads](https://static.pepy.tech/badge/osintbuddy)](https://pepy.tech/project/osintbuddy)
[![Downloads](https://static.pepy.tech/badge/osintbuddy/week)](https://pepy.tech/project/osintbuddy)


<p>
  <a href="https://github.com/osintbuddy/osintbuddy">
    <img src="./frontend/src/assets/images/watermark.svg" height="130px" alt="Logo">
  </a>

> *I have no data yet. It is a capital mistake to theorize before one has data. Insensibly
> one begins to twist facts to suit theories, instead of theories to suit facts.*


---

<span style="display: inline-block; width:830px"> </span>

  🚧 ⚠️ <ins> **Work in progress; Not ready for use, _yet_** </ins> ⚠️  🚧

  ## 🛡 Introducing OSINTBuddy

  <p>
      Welcome to the OSINTBuddy project where you can connect, combine,
      and get insight from unstructured and public data as results that
      can be explored step-by-step. An easy-to-use plugin system allows any
      developer to quickly integrate new data sources so you can focus
      on discovering, interacting, and visualizing what's important to you
  </p>


<br/>

  [osib-demo-2025-09-20.webm](https://github.com/user-attachments/assets/8e909285-62d7-43b4-8cd0-959c882fd37f)


</p>


<details open="open">
<summary>
<b>Table of Contents</b>
</summary>
  <ol>
    <li><a href="#what-is-osintbuddycom">What is OSINTBuddy</a></li>
    <li><a href="#-project-status">🚧 Project Status 🚧</a></li>
    <li><a href="#key-alpha-features">Alpha Features</a></li>
    <li><a href="#-a-vision">Our Vision</a></li>
    <li><a href="#-installation">Installation</a></li>
    <li><a href="#-license">License</a></li>
    <li><a href="#-related-projects">Related Projects</a></li>
    <li><a href="#-contact">Contact</a></li>
  </ol>
</details>

### What is <a referrerpolicy="unsafe-url" target="_blank" href="https://osintbuddy.com">osintbuddy.com</a>?


Not much, yet.


But here's the concept:

An almost incomprehensible amount of data is created every day. And each year, figures are growing at an ever-increasing rate. These data sources can be divided up into six different categories of information flow:


- Public government data
- Media *(newspapers, magazines, radio)*
- Internet *(blogs, discussion groups, citizen media, etc)*
- Professional and academic publications *(budgets, hearings, telephone directories, websites, etc)*
- Commercial data *(commercial imagery, financial assessments, databases, etc)*
- Grey literature *(technical reports, preprints, patents, business documents, etc)*


OSINT is a method of working with, assessing and ranking information — We are living in the [information age](https://en.wikipedia.org/wiki/Information_Age) and the volume of information OSINT research has to deal with *[(information explosion)](https://en.wikipedia.org/wiki/Information_explosion)* and the issue of low quality data leaves researchers drowning. The majority of this data is unstructured introducing many challenges to analyzing it and producing actionable intelligence since most data analytics databases are designed for structured data. We are surrounded by information and nearly none of it is useful.


I've decided to do something about it. The rapid developments in technologies such as AI and big data analytics have opened new horizons for OSINT which weren't previously available. We want all of that information at our fingertips. We want actionable intelligence quickly and to the point, that's why we're building an open-source OSINT tool that's free software. Built with plain old web technologies anyone can learn. But this isn't really the project. It's been three decades since its inception and the internets only proved to be a mirror of us, our society and politics. We face a series of significant challenges that directly threaten democratic values and processes. The question of who owns, designs, and controls technology has never been more urgent.


What are the technical frameworks that ensure that a technology is open and equitable; how do we "reconfigure" digital infrastructures to serve positive social transformation rather than corporate interests?s We need your help to design it, to program it, and to build it. Let's hear your suggestions, your ideas, and we're going to be building right in front of your eyes. The notion of a "needle in a haystack" is taken to the extreme on the internet. Let's build a magnet.


### ⚠ Project Status


> [!CAUTION]
>
> **⚠️ Experimental Software (pre-alpha) ⚠️**
>
> OSINTBuddy is currently experimental software. It's not quite ready for use *yet*! If you're interested in development you'll need the `plugins` docker service cloned: `git clone https://github.com/osintbuddy/plugins osintbuddy-plugins` to the root of this repo

As is, this project is more of a toy environment that's been useful while prototyping out this idea and gaining insight into the problem space. For this project to be truly successful we must ultimately be able to be used to do serious, original, and creative work. That's the basic test for whether our tools are genuinely working rather than merely telling a good story. What powerful, generalizable ideas can we learn from this project? How should the next wave of systems build on this? The system has to be shaped in a way which allows you to ask the questions you want to ask.

| Repository | Description | Language | Purpose | ETA |
|------------|-------------|----------|---------|-----|
| [`osintbuddy`](https://github.com/osintbuddy/osintbuddy) | The core application *(this repo)* | Rust, TypeScript/Preact |  Web interface and backend services | 3-5 months from alpha |
| [`plugins`](https://github.com/osintbuddy/plugins) | The Python plugin system package on PyPi | Python |  Extensible data collection framework | 3-5 months |
| [`entities`](https://github.com/osintbuddy/entities) | The default OSIB entity definitions | Python  | Default entity types and schemas | 4-6 months |

### Key Alpha Features

- ~~Works most of the time :)~~ We're currently in the process of finishing up the rewrite, stay tuned!
- **Visual Intelligence Made Simple**: Intuitive graph-based interface transforms complex data relationships into clear, interactive visualizations.
- **Extensible Plugin Architecture**: a Python-based plugin system allows custom entities to pull from any data source.
- **Self-hosted**: Your data can stay under your control with full privacy and security
- **Cost-Effective**: Ditch the enterprise pricing, access advanced OSINT capabilities with free open source software.
- **Open to contributions**.
- And check out the [open issues](https://github.com/jerlendds/osintbuddy/issues) for a list of requested features (and known bugs).
q

## ☀ A Vision

I have this conviction that a set of opportunities is available today. I believe it's now possible, if not today then soon, that will allow us to create a new immersive medium for not just traditional OSINT and research work but a medium for discovering, learning, researching, and coming to actionable insights in any number of contexts you can imagine. A medium such as photoshop is different from any of the individual tools photoshop contains. The range of possibilities in such immersive mediums are staggering and these possibilities emerge from the basic objects and actions in that medium.

Want to help out? Writing down and sharing your ideas, having discussions, and letting me know what works and doesn't, all act as a way to help bootstrap this project. It's a way of identifying points of leverage that might help us develop new tools for OSINT. So let's get started, here are [a few of my ideas](https://studium.dev/osib/ideas):

- **Collective Intelligence** - Collaborative workspaces for global knowledge sharing
- **Real-time Monitoring** - Automated data collection and alerts on changes
- **History Graphs & More** - A browser extension allowing you to visualize your web history as graph, scrape data, extract metadata, and more
- **AI/ML Integrations** - Sentiment analysis, audio transcriptions, LLMs/MCP, translating, etc


## 🛠 Installation

### Prerequisites

- [Git](https://git-scm.com/downloads)
- [Docker](https://www.docker.com/get-started/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Python 3.12+](https://github.com/pyenv/pyenv)
- [Rust](https://rustup.rs/)
- [KVM](https://linux-kvm.org/page/Main_Page)

### Configuration

- **Configure environment:** Copy `.env.example` file to `.env`, adjust the settings as needed.
    - ```bash
      cp .env.example .env
      ```
- **Configure frontend (optional):** Copy `frontend/.env.example` to `frontend/.env`, adjust as needed.
    - ```bash
      cp frontend/.env.example frontend/.env
      ```

---

### ⛔ Download the latest release ⛔

Once we iron out a few more bugs and a few more features we intend to setup a github actions workflow to build and package up the built frontend and Rust services. Follow the project [on discord](https://discord.gg/b8vW4J4skv) for the latest updates :)


### ✎ Development

This Rust rewrite exists because I got tired of Python and I decided to rewrite the entire thing to learn Rust. Now it's faster and crashes less *(hopefully)*.

If you want to start developing for OSINTBuddy, create or pick up an [issue](https://github.com/jerlendds/osintbuddy/issues) and follow these steps:

1. **Clone the repo**
   ```sh
   git clone https://github.com/osintbuddy/osintbuddy.git
   cd osintbuddy
   # using ssh?
   # git clone git@github.com:osintbuddy/osintbuddy.git
   ```

2. [**Install Docker & Compose**](https://docs.docker.com/get-started/get-docker/)

3. [**Initialize default entities** _(aka plugins)_](https://github.com/osintbuddy/plugins/blob/main/src/osintbuddy/ob.py#L85) for OSIB:
   ```sh
   git clone https://github.com/osintbuddy/plugins.git
   python3 -m venv venv
   . ./venv/bin/activate
   pip install ./plugins/
   ob init
   ```

4. **Start [the stack](https://github.com/osintbuddy/osintbuddy/blob/main/docker-compose.yml)**.
   ```
   docker compose up db ui
   ```

5. **Migrate database**.
   ```bash
   cargo install sqlx-cli --no-default-features --features native-tls,postgres
   cargo install cargo-watch
   cd crates/ && sqlx migrate run && cd ..
   ```

6. **Run OSIB**
   Run the backend `api` and `worker` on your host system in separate terminals:
   ```bash
   # NOTE: Make sure to run this terminal with Python env activated
   . /venv/bin/activate
   cargo watch -q -c -w crates/api -x "run -p api"

   # In another terminal run:
   cargo watch -q -c -w crates/worker -x "run -p worker"
   ```

7. **Access OSIB** through the URLs provided for the frontend, backend, and documentation:
   - Frontend: [`http://localhost:55173`](http://localhost:55173)
   - Backend: [`http://localhost:48997/api`](http://localhost:48997/api)
   - Docs: [`http://localhost:55173/docs/overview`](http://localhost:55173/docs/overview)


#### ☠ Shutting down OSIB

- **To stop OSINTBuddy**: `Ctrl+C`/kill the worker and api terminals, then `docker compose down` to clean up.
- **To delete *all* OSINTBuddy data**: Data removal is an **irreversible** operation!  **DO NOT** run this command if you do not want to lose **all** of your data! To remove all the data stored in your OSINTBuddy server run `docker compose down --volumes`.

---

## [↑](#introducing-osintbuddy)⚖ License

We are using the [GNU Affero General Public License v3.0](https://choosealicense.com/licenses/agpl-3.0/) (AGPL) as we want to guarantee freedom of use, reuse, copy, modification and re-publication of modifications.  Because freedom doesn’t mean permissiveness, it means reciprocity. If you build on it, you give back. That’s how the commons stays healthy. This is a technopolitical decision encoded into the social contract. Suffice to say here that the Affero GPLv3 license legally binds the service providers to give direct access to any user to the computer code that runs in a given instance.

- **Note**: *the [OSINTBuddy PyPi package](https://github.com/jerlendds/osintbuddy-plugins) is MIT licensed. We understand some individuals and businesses may not want to share their custom plugins.*


## [↑](#introducing-osintbuddy)☍ Related Projects

> Empowering investigators & cybersecurity enthusiasts to uncover truths, fight injustice, and create a safer world.

+ https://phantomhelix.com/product/sierra?ref=osintbuddy.com

+ https://phantomhelix.com/download

---

> Start with one lead.
> Close cases 12x faster with OSINT.

+ https://www.maltego.com/?ref=osintbuddy.com

---

> LinkScope allows you to perform online investigations by representing information as discrete pieces of data, called Entities.

+ https://github.com/AccentuSoft/LinkScope_Client?ref=osintbuddy.com

---

> the first automatically GPU-accelerated platform, harness all of your data without worrying about scale, and pivot on the fly to follow anywhere your investigation leads you. Ideal for everything from security, fraud, and IT investigations to 360° views of customers and supply chains to mapping cancer mutations, Graphistry turns the potential of your data into human insight and value.

+ https://www.graphistry.com/?ref=osintbuddy.com

## [↑](#introducing-osintbuddy)✉ Contact

[Open an issue](https://github.com/osintbuddy/osintbuddy/issues/new?assignees=jerlendds&labels=Type%3A+Suggestion&projects=&template=&title=%5BFEATURE+REQUEST%5D) if you need to get in touch with me or send an email to <a href="mailto:oss@osintbuddy.com">oss@osintbuddy.com</a>.


[contributors-shield]: https://img.shields.io/github/contributors/jerlendds/osintbuddy.svg?style=for-the-badge
[contributors-url]: https://github.com/jerlendds/osintbuddy/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/jerlendds/osintbuddy.svg?style=for-the-badge
[forks-url]: https://github.com/jerlendds/osintbuddy/network/members
[stars-shield]: https://img.shields.io/github/stars/jerlendds/osintbuddy.svg?style=for-the-badge
[stars-url]: https://github.com/jerlendds/osintbuddy/stargazers
[issues-shield]: https://img.shields.io/github/issues/jerlendds/osintbuddy.svg?style=for-the-badge
[issues-url]: https://github.com/jerlendds/osintbuddy/issues
