#  ⚠️🚧 WORK IN PROGRESS 🚧⚠️ 

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![Total Downloads](https://static.pepy.tech/badge/osintbuddy)](https://pepy.tech/project/osintbuddy)
[![Downloads](https://static.pepy.tech/badge/osintbuddy/week)](https://pepy.tech/project/osintbuddy)
[![OpenCollective Backers](https://badgen.net/opencollective/backers/osintbuddy)](https://opencollective.com/openinfolabs/projects/osintbuddy#category-CONTRIBUTE)

<p>
  <a href="https://github.com/osintbuddy/osintbuddy">
    <img src="./watermark.svg" height="130px" alt="Logo">
  </a>

> *I have no data yet. It is a capital mistake to theorize before one has data. Insensibly
> one begins to twist facts to suit theories, instead of theories to suit facts.*


-------
| &nbsp;&nbsp; [plugins-system](https://github.com/osintbuddy/plugins) &nbsp;&nbsp; | &nbsp;&nbsp; ~~[osintbuddy.com](https://osintbuddy.com)~~ &nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; [osintbuddy discord](https://discord.gg/b8vW4J4skv) &nbsp;&nbsp; | &nbsp;&nbsp; [entities](https://github.com/osintbuddy/entities) &nbsp;&nbsp; |
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
- Open for contributions.
- Works most of the time :)


## Getting Started

To start using OSINTBuddy, follow these simple installation steps:

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
   docker compose up
   ```

  - **Login into OSINTBuddy with**:
    - *username:* osintbuddy
    - *password:* osintbuddy

- URLs
  - Frontend: *http://localhost:3000*
  - Casdoor: *http://localhost:45910*
  - Backend: *http://localhost:48997/api*
  - Documentation: *http://localhost:48997/docs*

Access OSINTBuddy through the URLs provided for the frontend, backend, and documentation.

## [↑](#introducing-osintbuddy)Roadmap

See the [open issues](https://github.com/jerlendds/osintbuddy/issues)
for a list of requested features (and known issues).

## [↑](#introducing-osintbuddy)License

We are using the [GNU Affero General Public License v3.0](https://choosealicense.com/licenses/agpl-3.0/) (AGPL)

*Note: the [OSINTBuddy PyPi package](https://github.com/jerlendds/osintbuddy-plugins) is MIT licensed. We understand some individuals and businesses may not want to share their plugins developed in-house.*

## [↑](#introducing-osintbuddy)Contact

[Open an issue](https://github.com/osintbuddy/osintbuddy/issues/new?assignees=jerlendds&labels=Type%3A+Suggestion&projects=&template=&title=%5BFEATURE+REQUEST%5D) if you need to get in touch with me send an email to <a href="mailto:oss@osintbuddy.com">oss@osintbuddy.com</a>.


## [↑](#introducing-osintbuddy)Sponsor OSINTBuddy 
Let's be real: keeping a project like this afloat takes serious energy...and a lot of coffee. Sponsoring the project makes it possible for us to cover our coffee costs. 
Depending on your level of sponsorship you may get unique benefits – like our eternal gratitude and *maybe* a virtual coffee refill.

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
