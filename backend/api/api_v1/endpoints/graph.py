from uuid import UUID
from typing import Annotated, Union
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text, select
from sqlalchemy.pool import PoolProxiedConnection

import ujson
from starlette import status
from api import deps
import crud, schemas
from core.logger import get_logger

from api.utils import get_hid

log = get_logger("api_v1.endpoints.graph")
router = APIRouter(prefix="/graph")


@router.get("/{hid}", response_model=schemas.Graph)
async def get_graph(
    user: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_session)],
    hid: Annotated[str, Depends(deps.get_graph_id)],
    db: Annotated[Session, Depends(deps.get_db)],
):
    try:
        graph = await crud.graphs.get(
            db=db,
            id=hid
        )
        return graph
    except Exception as e:
        log.error('Error inside graph.get_graph:')
        log.error(e)
        raise HTTPException(status_code=
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="There was an error fetching graphs. Please try reloading the page"
        )


@router.get(
    "",
    response_model=schemas.AllGraphsList,
)
async def get_graphs(
    user: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_session)],
    db: Annotated[Session, Depends(deps.get_db)],
    skip: int = 0,
    limit: int = 100,
    favorite_skip: int = 0,
    favorite_limit: int = 100
) -> schemas.GraphsList:
    if favorite_limit > 50:
        favorite_limit = 50
    if limit > 50:
        limit = 50
    graphs, graphs_count = await crud.graphs.get_many_user_graphs(
        db=db,
        user=user,
        skip=skip,
        limit=limit,
        is_favorite=False
    )
    favorite_graphs, favorite_count = await crud.graphs.get_many_user_graphs(
        db=db,
        user=user,
        skip=favorite_skip,
        limit=favorite_limit,
        is_favorite=True
    )
    return {
        "graphs": graphs,
        "count": graphs_count,
        "favorite_graphs": favorite_graphs,
        "favorite_count": favorite_count
    }


@router.get(
    "/favorites",
    response_model=schemas.GraphsList
)
async def get_graphs_by_favorite(
    user: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_session)],
    db: Annotated[Session, Depends(deps.get_db)],
    skip: int = 0,
    limit: int = 100,
    is_favorite: bool = None
):
    try:
        graphs, graphs_count = await crud.graphs. \
            get_many_user_graphs(db, user, skip, limit, is_favorite=is_favorite)
        return {
            "graphs": graphs,
            "count": graphs_count
        }
    except Exception as e:
        log.error('Error inside graph.get_favorite_graphs:')
        log.error(e)
        raise HTTPException(status_code=
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="There was an error fetching graphs. Please try reloading the page"
        )


@router.post(
    '',
    response_model=schemas.Graph
)
async def create_graph(
    _: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_session)],
    obj_in: schemas.GraphCreate,
    db: Annotated[Session, Depends(deps.get_db)],
):
    obj_out = await crud.graphs.create(db=db, obj_in=obj_in)
    async with deps.get_age() as age:
        await age.execute(select(text(f"create_graph('g_{obj_out.uuid.hex}')")))
    print("CREATE age graph: ", f"g_{obj_out.uuid.hex}")
    return obj_out


@router.delete('')
async def delete_graph(
    user: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_session)],
    hid: Annotated[str, Depends(deps.get_graph_id)],
    db: Annotated[Session, Depends(deps.get_db)],
):
        await crud.graphs.remove(db=db, id=hid)
        return


@router.patch('/{hid}/favorite/')
async def update_graph_favorite_id(
    user: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_session)],
    hid: Annotated[str, Depends(deps.get_graph_id)],
    db: Annotated[Session, Depends(deps.get_db)],
):
    try:
        db_obj = await crud.graphs.get(
            db=db,
            id=hid
        )
        updated_graph = await crud.graphs.update_favorite_by_uuid(
            db,
            db_obj=db_obj,
            is_favorite=not db_obj.is_favorite
        )
        return updated_graph
    except Exception as e:
        log.error('Error inside graph.update_graph_favorite_id:')
        log.error(e)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="There was an error bookmarking your graphs. Please try reloading the page"
        )


@router.get('/{hid}/stats')
async def get_graph_stats(
    user: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_session)],
    hid: Annotated[str, Depends(deps.get_graph_id)],
    db: Annotated[Session, Depends(deps.get_db)],
):
    selected_graph = await crud.graphs.get(db, id=hid)
    verticies_query = f"""* FROM cypher('g_{selected_graph.uuid.hex}', $$
MATCH (v)
RETURN v
$$) as (v agtype)"""
    edges_query = f"""* FROM cypher('g_{selected_graph.uuid.hex}', $$
MATCH ()-[e]->()
RETURN e
$$) as (e agtype)"""
    degree_query = f"""* FROM cypher('g_{selected_graph.uuid.hex}', $$
MATCH ()-[]->(t)-[]->(s)
RETURN s
$$) as (s agtype)"""

    async with deps.get_age() as conn:
        vertex_rows = await conn.execute(select(text(verticies_query)))
        vertices = [ujson.loads(v[0].replace('::vertex', '')) for v in vertex_rows]
        
        edge_rows = await conn.execute(select(text(edges_query)))
        edges: list = [ujson.loads(e[0].replace('::edge', '')) for e in edge_rows]

        degree_rows = await conn.execute(select(text(degree_query)))
        second_degree_entities = [ujson.loads(v[0].replace('::vertex', '')) for v in degree_rows]

    return {
        "entities_count": len(vertices),
        "edges_count": len(edges),
        "second_degree_count": len(second_degree_entities)
    }
