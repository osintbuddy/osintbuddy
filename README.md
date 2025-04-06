[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![Total Downloads](https://static.pepy.tech/badge/osintbuddy)](https://pepy.tech/project/osintbuddy)
[![Downloads](https://static.pepy.tech/badge/osintbuddy/week)](https://pepy.tech/project/osintbuddy)
[![OpenCollective Backers](https://badgen.net/opencollective/backers/osintbuddy)](https://opencollective.com/openinfolabs/projects/osintbuddy#category-CONTRIBUTE)


<br />


<p>
  <a href="https://github.com/jerlendds/osintbuddy">
    <img src="./watermark.svg" height="130px" alt="OSINTBuddy Logo">
  </a>

> *I have no data yet. It is a capital mistake to theorize before one has data. Insensibly
> one begins to twist facts to suit theories, instead of theories to suit facts.*


-------
| &nbsp;&nbsp; [osintbuddy-plugins](https://github.com/jerlendds/osintbuddy-plugins) &nbsp;&nbsp; | &nbsp;&nbsp; [osintbuddy.com](https://osintbuddy.com) &nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; [osintbuddy discord](https://discord.gg/gsbbYHA3K3) &nbsp;&nbsp; | &nbsp;&nbsp; [osintbuddy-core-plugins](https://github.com/jerlendds/osintbuddy-core-plugins) &nbsp;&nbsp; |
<span style="display: inline-block; width:830px"> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;   </span>


  ## Introducing OSINTBuddy

  <p>
      Welcome to the OSINTBuddy project where you can connect, combine,
      and get insight from unstructured and public data as results that
      can be explored step-by-step. An easy-to-use plugin system allows any
      Python developer to quickly integrate new data sources so you can focus 
      on discovering, interacting, and visualizing what's important to you
  </p>

  🚧  <ins>Work in progress</ins>  🚧
<br/>

  [2024-01-09 20-55.webm](https://github.com/jerlendds/osintbuddy/assets/29207058/fb07fa95-30af-45aa-a75b-2fa1473bc37b)


  <!-- ⚠️ **Want to contribute?** ⚠️  -->
    
  To get started please see [CONTRIBUTING.md](./.github/CONTRIBUTING.md), and [CONTRIBUTOR_AGREEMENT.md](./.github/CONTRIBUTOR_AGREEMENT.md) to agree with the AGPLv3

  ---
</p>

<details open="open">
<summary> 
<b>Table of Contents</b>
</summary>
  <ol>
    <li>
      <a href="#what-is-osintbuddycom">What is OSINTBuddy</a>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#sponsor-osintbuddy">Sponsor OSINTBuddy</a></li>
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


OSINT is a method of working with, assessing and ranking information — We are living in the [information age](https://en.wikipedia.org/wiki/Information_Age) and the volume of information OSINT research has to deal with [(information explosion)](https://en.wikipedia.org/wiki/Information_explosion) and the issue of low quality data leaves researchers drowning. The majority of this data is unstructured introducing many challenges to analyzing it and producing actionable intelligence since most data analytics databases are designed for structured data. We are surrounded by information and nearly none of it is useful. 


We've decided to do something about it. The rapid developments in technologies such as AI and big data analytics have opened new horizons for OSINT which weren't previously available. We want to put all of that information at your fingertips. We want actionable intelligence quickly and to the point, that's why we're building an open-source OSINT tool that's free. Free to use, free to modify, free to do with as you wish, and built with plain old web technologies anyone can learn. But this isn't really the project. This is a free new community. A community for OSINT enthusiasts around the world and we need your help to design it, to program it, and to build it. We want to hear your suggestions, your ideas, and we're going to build it right in front of your eyes. The notion of a “needle in a haystack” is taken to the extreme on the internet. Let's build a magnet.


### Key Alpha Features
- Visual representation and layout modes for fetched data for easy understanding and editing. 
- Simplified data fetching/transformations from custom sources using Python plugins, custom plugin/entity field layouts, check out the [osintbuddy](https://pypi.org/project/osintbuddy/) PyPi package for more details and expect many more input fields like files and checkboxes/toggles to come in the future.
- A development platform that is open for contributions.
- Works most of the time :)


### The future

At the core of this project lies a far more ambitious vision than the mere creation of an all-in-one data aggregation and analysis tool. What we aspire to start is the birth of a knowledge-driven community, passionately dedicated to the development of an evolving intelligence tool - a system and platform designed for discovering, interacting, and visualizing information to derive actionable insights. We imagine a system that not only learns from and evolves with your skills but also augments them. Here are some of our ideas for the future in no particular order:


#### Intuitive search and discovery tools

- We want you to be able to interact with our algorithms, filter, segment, search for particular data, apply advanced query filters, data layouts, build queries visually, and more so you can uncover insights that matter via an easy-to-navigate web-based interface.


#### Collective intelligence through collaborative workspaces

- We want to create a platform that promotes collective intelligence. Think of the currently popular collaborative workspaces such as [AFFiNE](https://github.com/toeverything/AFFiNE), Logseq, or Obsidian but built into our data workspace. A system where each individual user contributes to the pool of knowledge, where you can share your graph environments, where you can track changes with annotations and comments, where insights from your workspaces can be optionally published and engaged with by a global community. Where every connection made, every data source integrated, every plugin created and shared by members of our community contributes to advancing insights around the world. 


#### Real-time monitoring

- We want functionality that can provide real-time updates for a set of entities or scans, notifying you when theres new data, changes, and or emerging patterns in your field of interest. Automatically retrieve insights as time goes on and learn from history with snapshots of your past data.


#### History graphs

- We want to create a browser extension that allows you to seamlessly browse the web while also populating your OSINTBuddy graph. Each website you visit is mapped as an entity, with lines connecting them in the sequence you’ve traveled. Not just a bookmark list or a history tab, the history graph could maintain the context, showing not just where you’ve been, but also how and when you got there, and with the ability to extract a comment or piece of data out of a website you visit into an entity, you'll rarely have to leave your favorite web browser. 


#### AI, swarm intelligence, and evolutionary algorithms

- Integrating AI, swarm intelligence, and evolutionary algorithms could let us create a tool that can continually evolve and optimize your operations over time. From NLP and sentiment analysis to search and anomaly detection with swarm intelligence, bringing data science tools and techniques to OSINTBuddy could let use create a powerful tool that reveals deep insights among a "haystack" of noisy information. 


This is a project that will most likely not be finished for many years if ever, and that will require collaboration among experts in many fields. We're always looking for help, from writing documentation, researching feature ideas, designing the UX/UI, donating, to simply marketing and sharing the project, anything you contribute helps realize a vision for what could turn into a cross-disciplinary toolkit for working with information. Will you join me?


## Getting Started

To start using OSINTBuddy, follow these simple installation steps:

*Note that if you're on windows and want this project to work you need unix line endings [(context)](https://stackoverflow.com/a/13154031). Before cloning, run: `git config --global core.autocrlf false`*


*Note that if you're running on an **Apple** device you will need to open your Docker app, select the **features in development** tab on the left hand side of the docker app, and enable/checkmark the `Use Rosetta for x86/64 emulation on Apple Silicon` option if you want this application to work*


### Installation
1. Clone the repo and submodules
   ```sh
   git clone --recurse-submodules https://github.com/jerlendds/osintbuddy.git
   cd osintbuddy
   # using ssh?
   # git clone --recurse-submodules git@github.com:jerlendds/osintbuddy.git 
   ```

2. Install Docker & Compose
    - [Install Guide for Mac](https://docs.docker.com/desktop/install/mac-install/)
    - [Install Guide for Windows](https://docs.docker.com/desktop/install/windows-install/)
    - [Install Guide for Linux](https://docs.docker.com/desktop/install/linux-install/)

3. Initialize core plugins for OSINTBuddy:
   ```sh
   python3 -m venv venv
   . ./venv/bin/activate
   pip install osintbuddy
   ob init
   ```

- **URLs**
  - Frontend: http://localhost:3000
  - Casdoor: http://localhost:45910
  - Backend: http://localhost:48997/api
  - Documentation: http://localhost:48997/docs
- Access OSINTBuddy through the URLs provided for the frontend, backend, and documentation.
  - Default login:
    - *username:* osintbuddy
    - *password:* osintbuddy
## [↑](#introducing-osintbuddy)Roadmap

See the [open issues](https://github.com/jerlendds/osintbuddy/issues)
for a list of requested features (and known issues).

## [↑](#introducing-osintbuddy)Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**. But if you'd like to make a significant change to this project or the `osintbuddy-plugins` project, please first [create an issue](https://github.com/jerlendds/osintbuddy/issues/new?assignees=jerlendds&labels=Type%3A+Suggestion&projects=&template=feature.md&title=%5BFEATURE+REQUEST%5D+Your_feature_request_here) or open a contributor post on the [forum](https://forum.osintbuddy.com/c/osintbuddy-contributors/11) to get feedback before spending too much time. We don't want you to invest your time on changes we are already working on. Also, for details on how to get up and running with the project you can check out [CONTRIBUTING.md](./.github/CONTRIBUTING.md). If you want to contribute directly please ensure you agree with the [CONTRIBUTOR_AGREEMENT.md](./.github/CONTRIBUTOR_AGREEMENT.md), in short, we want to ensure you're okay with your changes being licensed under the AGPLv3.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/add-core-feature`)
3. Commit your Changes (`git commit -m 'feat: add core feature to osintbuddy app'`)
4. Push to the Branch (`git push origin feature/add-core-feature`)
5. Open a Pull Request

*Note: If you're working on the `develop` branch you want to ensure the `osintbuddy-plugins` submodule is also on the develop branch.*

## [↑](#introducing-osintbuddy)License

We are using the [GNU Affero General Public License v3.0](https://choosealicense.com/licenses/agpl-3.0/) (AGPL)

### The four freedoms and one obligation of free software
- The right to use the software at your own discretion
- The right to study the software
- The right to modify the software
- The right to redistribute the software, including with modifications
- The obligation to keep those four rights, effectively keeping the software in the commons.

> We need to realize that any software without that last obligation will, sooner or later, become an oppression tool against ourselves. And that maintaining the commons is not only about software. It’s about everything we are as a society and everything we are losing against individual greed. 


*Note: the [OSINTBuddy PyPi package](https://github.com/jerlendds/osintbuddy-plugins) is MIT licensed. We understand some individuals and businesses may not want to share their plugins developed in-house.*

Patched `aiogremlin` library: [jerlendds/gremlinpy](https://github.com/jerlendds/gremlinpy/)


## [↑](#introducing-osintbuddy)Contact

[Open an issue](https://github.com/jerlendds/osintbuddy/issues/new?assignees=jerlendds&labels=Type%3A+Suggestion&projects=&template=feature.md&title=%5BFEATURE+REQUEST%5D+Your_feature_request_here) if you need to get in touch with me or send an email to <a href="mailto:oss@osintbuddy.com">oss@osintbuddy.com</a>.


## [↑](#introducing-osintbuddy)Sponsor OSINTBuddy 
Help us keep the project free and maintained. Sponsoring the project makes it possible for us to cover our server costs and allows us to make investments into new areas of development. 
Depending on your level of sponsorship you may get unique benefits. Learn more on the [OSINTBuddy OpenCollective](https://opencollective.com/openinfolabs/projects/osintbuddy#category-CONTRIBUTE)

[![Yearly OpenCollective Income](https://badgen.net/opencollective/yearly/osintbuddy)](https://opencollective.com/openinfolabs/projects/osintbuddy#category-CONTRIBUTE)
[![OpenCollective Backers](https://badgen.net/opencollective/backers/osintbuddy)](https://opencollective.com/openinfolabs/projects/osintbuddy#category-CONTRIBUTE)


[contributors-shield]: https://img.shields.io/github/contributors/jerlendds/osintbuddy.svg?style=for-the-badge
[contributors-url]: https://github.com/jerlendds/osintbuddy/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/jerlendds/osintbuddy.svg?style=for-the-badge
[forks-url]: https://github.com/jerlendds/osintbuddy/network/members
[stars-shield]: https://img.shields.io/github/stars/jerlendds/osintbuddy.svg?style=for-the-badge
[stars-url]: https://github.com/jerlendds/osintbuddy/stargazers
[issues-shield]: https://img.shields.io/github/issues/jerlendds/osintbuddy.svg?style=for-the-badge
[issues-url]: https://github.com/jerlendds/osintbuddy/issues
