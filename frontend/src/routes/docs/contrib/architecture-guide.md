---
title: Architecture guide
pageTitle: Architecture.md 
description: The overall design and architecture of OSINTBuddy.
---

This document describes the high-level architecture of osintbuddy. Please be aware the project is in a very early alpha state and major changes may occur!

---

## Overview

On the highest level, OSINTBuddy is a thing which lets users build node graphs on the client, these nodes, known as entities, can have transforms attached to them. Data transforms connect to a Python plugin system which can be hooked up to public data sources such as: government data, search engines, or for whatever a Plugin author decides to implement.

### Project Structure

```js
frontend                         // react frontend
backend
├── backend
│   ├── app
│   │   ├── alembic              // migrations
│   │   ├── app
│   │   │   ├── admin            // sqladmin models
│   │   │   ├── api              // controllers/api endpoints
│   │   │   │   └── api_v1       
│   │   │   ├── core             // env settings/celery app/logger/hashing
│   │   │   ├── crud             // views/crud functions
│   │   │   ├── db               // db initialization and base model classes
│   │   │   ├── models           // relational data models
│   │   │   ├── schemas          // pydantic/validation schemas
│   │   │   ├── plugins          // data sources/user plugins
│   │   │   └── tests 
│   │   └── scripts              // startup/testing scripts used by docker
├── microservice                 
└   └── google-service           // golang google crawlers
```


### Core Services
  - **Frontend - [React](https://legacy.reactjs.org/docs/getting-started.html)**
  - **Backend - [FastAPI](https://fastapi.tiangolo.com/)**
  - **Caching - [Redis](https://redis.io/docs/)**
  - **Graph database - [JanusGraph](https://janusgraph.org/) + [ScyllaDB](https://www.scylladb.com/)**
  - **Task queue - [Redis & Celery](https://docs.celeryq.dev/en/stable/getting-started/backends-and-brokers/redis.html)**
  - **Relational database - [PostgreSQL](https://www.postgresql.org/docs/)**

