import copy
from uuid import UUID
import ujson
from typing import List, Annotated, Dict
from itertools import starmap
import httpx
from fastapi import APIRouter, WebSocket, WebSocketException, WebSocketDisconnect, HTTPException, Depends
from websockets.exceptions import ConnectionClosedError
from osintbuddy.utils import to_snake_case, MAP_KEY
from sqlalchemy.orm import Session
from sqlalchemy import text, select

import schemas, crud
from api import deps

router = APIRouter(prefix="/node")

async def get_blueprint(label: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"http://plugins:42562/blueprint?label={label}")
        blueprint = response.json()
        return blueprint


async def get_blueprints() -> dict[str, dict]:
    blueprints = {}
    async with httpx.AsyncClient() as client:
        response = await client.get("http://plugins:42562/refresh?labels=1", timeout=None)
        entity_labels = response.json()
        for label in entity_labels:
            blueprint = await get_blueprint(label)
            blueprints[label] = blueprint
    return blueprints


@router.get("/refresh")
async def refresh_entity_plugins(
    _: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_session)],
):
    async with httpx.AsyncClient() as client:
        response = await client.get("http://plugins:42562/refresh", timeout=None)
        entities = response.json()
        return {"status": "success", "plugins": entities}


@router.post("/")
async def create_entity_on_drop(
    _: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_session)],
    hid: Annotated[str, Depends(deps.get_graph_id)],
    create_node: schemas.CreateNode,
    db: Session = Depends(deps.get_db)
):
    active_inquiry = await crud.graphs.get(db, id=hid)
    label = to_snake_case(create_node.label)
    blueprint = await get_blueprint(label)
    blueprint["position"] = create_node.position.model_dump()
    return await save_node_on_drop(
        create_node.label,
        blueprint,
        active_inquiry.uuid
    )


async def save_node_on_drop(
    node_label,
    blueprint: dict,
    uuid: UUID
):
    q = f"""* 
FROM cypher('g_{uuid.hex}', $$
CREATE (v:{to_snake_case(node_label)}
{{x: '{blueprint['position'].get('x', 0.0)}', y: '{blueprint['position'].get('y', 0.0)}'}})
RETURN v
$$) as (v agtype);
    """
    async with deps.get_age() as conn:
        result = await conn.execute(select(text(q)))
        age_vert = result.scalars().one()
        print('age_vert !! ', age_vert)
        vertex_properties = ujson.loads(age_vert.replace("::vertex", ""))
        print('vertex_properties', vertex_properties)
    return {
        "id": f"{vertex_properties["id"]}",
        "type": "edit",
        "data": {
            'color': blueprint.pop('color', '#145070'),
            'icon': blueprint.pop('icon', 'atom-2'),
            'label': blueprint.pop('label'),
            'elements': blueprint.pop('elements'),
        }
    }


def set_entity_data(target_element, source_vertex) -> None:
    entity_keys = source_vertex.keys()
    obmap = {}
    if len(entity_keys) > 1:
        for d_key in entity_keys:
            key_split = d_key.split(MAP_KEY)
            if len(key_split) > 1:
                obmap[key_split[1]] = d_key
            else:
                obmap[key_split[0]] = ""
    entity_label = to_snake_case(target_element['label'])
    if source_vertex.get(entity_label):
        target_element['value'] = source_vertex[entity_label]
    else:
        json_element = {k: v for k, v in obmap.items() if entity_label in k}
        for k, v in json_element.items():
            if entity_label not in k:
                target_element[k] = source_vertex[v][0]


async def load_nodes_from_db(uuid: UUID, viewport=None) -> tuple[list, list]:
    q = f"""
* FROM cypher('g_{uuid.hex}', $$
MATCH (v)
RETURN v
$$) as (v agtype)"""
    zoom_scale = viewport.get('zoom')
    x = viewport.get('x')
    y = viewport.get('y')

    async with deps.get_age() as conn:
        rows = await conn.execute(select(text(q)))
        vertices = [ujson.loads(r[0].replace("::vertex", "")) for r in rows]
        edges: list = []
        # TODO: Load/update UI nodes on far drag
        # TODO: unload nodes UI side when off screen offset by max drag distance
        return vertices, edges


async def read_graph(viewport_event, send_json, project_uuid, is_initial_read: bool = False):
    print(f'reading graph: g_{project_uuid.hex}')
    blueprints = await get_blueprints()
    verticies, edges = await load_nodes_from_db(project_uuid, viewport_event)
    entities = list(map(lambda v: copy.deepcopy(blueprints.get(v.get('label'))), verticies))

    def vertex_to_entity(vertex, entity):
        vertex_properties = vertex.get('properties')
        position = {'x': vertex_properties.pop('x'), 'y': vertex_properties.pop('y')}
        if len(vertex_properties):
            for element in entity['data']['elements']:
                if isinstance(element, list):
                    [set_entity_data(elm, vertex_properties) for elm in element]
                else:
                    set_entity_data(element, vertex_properties)
        entity['position'] = position
        entity['id'] = str(vertex.pop('id'))
        entity['type'] = 'view'
        return entity

    await send_json({
        'action': 'isInitialRead' if is_initial_read else 'read',
        'nodes': list(map(vertex_to_entity, verticies, entities)),
        'edges': []
    })


async def update_node(node, send_json, uuid: UUID):
    if vertex_target_id := node.pop('id'):
        async with deps.get_age() as conn:
            for k, v in node.items():
                q = f"""* 
FROM cypher('g_{uuid.hex}', $$
MATCH (v) WHERE id(v)={vertex_target_id}
SET v.{to_snake_case(k)} = {f'\'{v}\'' if type(v) == str else v} 
$$) as (v agtype)"""
                print("update query ->")
                print(q)
                await conn.execute(select(text(q)))


async def remove_nodes(node, send_json, uuid: UUID):
    delete_connected_vertex = f"""* FROM cypher('g_{uuid.hex}', $$
MATCH (v)
WHERE id(v)={node['id']}
DETACH DELETE v
$$) as (v agtype);
"""
    delete_single_vertex = f"""* FROM cypher('g_{uuid.hex}', $$
MATCH (v)
WHERE id(v)={node['id']}
DELETE v
$$) as (v agtype);
"""
    print('(v) REMOVAL id: ', node['id'])
    async with deps.get_age() as conn:
        await conn.execute(select(text(delete_single_vertex)))
        await conn.execute(select(text(delete_connected_vertex)))
    await send_json({"action": "removeEntity", "node": node})


async def get_transform_notification(transform_output, transform_type):
    notification_msg = f'Transform {transform_type.lower()} '
    if len(transform_output) > 0:
        notification_msg = notification_msg + f'returned {len(transform_output)} '
        if len(transform_output) > 1:
            notification_msg = notification_msg + "entities!"
        else:
            notification_msg = notification_msg + "entity!"
    else:
        notification_msg = notification_msg + " found no results!"
    return notification_msg




async def add_node_element(element: dict or List[dict], properties):
    # Remove stylistic values unrelated to element data
    # Some osintbuddy.elements of type displays dont have an icon or options 
    icon = element.pop('icon', None)
    options = element.pop('options', None)
    element_label = element.pop('label')
    elm_type = element.pop('type')
    print("ADD_NODE_ELEMENT: ", element, element_label)
    if elm_type == 'empty':
        return
    if element_value := element.get('value'):
        print("value", element_value)
        properties[to_snake_case(element_label)] = element_value
    else:
        for k, v in element.items():
            properties[f'{to_snake_case(element_label)}_{to_snake_case(k)}'] = v
    # Save the data labels so we can assign these as meta properties later
    element['type'] = elm_type
    element['icon'] = icon
    element['label'] = element_label
    if options:
        element['options'] = options
        return element


def dict_to_opencypher(x):
    import re
    properties = "{"
    for k, v in x.items():
        properties += f"{k}: "
        if type(v) == str:
            properties += f"'{v}', "
        else:
            properties += f'{v}, '
    properties += "}"
    return re.sub(r",\s+}", "}", properties)


async def save_entity_transform(
    transform_result: dict,
    entity_context: dict,
    graphid: UUID
):
    """
    Map entity elements returned from transform
    """
    vertex_properties = {}
    edge_label = None
    if transform_result:
        edge_label = transform_result.pop('edge_label', None)
    from_position = entity_context.get('position')
    vertex_properties['x'] = from_position.get('x', 0) + 50
    vertex_properties['y'] = from_position.get('y', 0) + 50
    # print("SAVINGIN ENTITY TRANSFORM: ", transform_result, entity_context)


    for element in transform_result['elements']:
        if isinstance(element, list):
            [await add_node_element(elm, vertex_properties) for elm in element]
        else:
            await add_node_element(element, vertex_properties)

    q = f"""* FROM cypher('g_{graphid}', $$
CREATE (v:{to_snake_case(transform_result.get('label'))} {dict_to_opencypher(vertex_properties)})
RETURN v
$$) as (v agtype);
    """
    print('RUNNING', q)
    async with deps.get_age() as conn:
        result = await conn.execute(select(text(q)))
        age_vert = result.scalars().one()
        print('age_vert !! ', age_vert)
        new_entity = ujson.loads(age_vert.replace("::vertex", ""))

    # # TODO: support adding optional kwargs to edge properties
    # add_edge = {
    #         'id': entity_source['id'],
    #         'label': edge_label
    #     } if edge_label else {}
    return {
        "id": f"{new_entity.get('id')}",
        "type": "edit",
        "action": "createEntity",
        "position": entity_context["position"],
        "parentId": entity_context["id"],
        "data": {
            "color": transform_result.pop("color"),
            "icon": transform_result.pop("icon"),
            "label": transform_result.pop("label"),
            "elements": transform_result.pop("elements"),
        }
    }


# TODO: Finish implementing 'multiplayer' logic
graph_users: Dict[str, WebSocket] = {}

@router.websocket("/graph/{hid}")
async def active_graph_inquiry(
    websocket: WebSocket,
    user: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_ws)],
    hid: Annotated[int, Depends(deps.get_graph_id)],
    db: Session = Depends(deps.get_db)
):
    graph_users[user.cid.hex] = websocket  
    active_inquiry = await crud.graphs.get(db, id=hid)
    await websocket.accept()
    if active_inquiry is not None:
        await graph_users[user.cid.hex].send_json({"action": "isLoading", "detail": True })
    else:
        websocket.send({"action": "error"})

    for user_cid, ws in graph_users.items():
        try:
            async for event in ws.iter_json():
                user_event: list = event["action"].split(":")
                action = user_event[0]
                IS_READ: bool = action == "read"
                IS_UPDATE: bool = action == "update"
                IS_DELETE: bool = action == "delete"
                IS_TRANSFORM: bool = action == "transform"
                IS_INITIAL: bool = 'initial' in action

                ACTION_TARGET = user_event[1]

                if ACTION_TARGET == 'node':
                    if IS_UPDATE:
                        await update_node(event["node"], ws.send_json, active_inquiry.uuid)
                    if IS_DELETE:
                        print("DELETING", event["node"])
                        await remove_nodes(event["node"], ws.send_json, active_inquiry.uuid)
                    if IS_TRANSFORM:
                        await ws.send_json({"action": "isLoading", "detail": True })
                        # await nodes_transform(event["node"], ws.send_json, active_inquiry.uuid)
                if ACTION_TARGET == 'graph':
                    if IS_READ:
                        await read_graph(event["viewport"], ws.send_json, active_inquiry.uuid)
                        await ws.send_json({ "action": "isLoading", "detail": False, "message": "Success! You've been reconnected!" })
                    if IS_INITIAL:
                        await ws.send_json({"action": "isLoading", "detail": True })
                        await read_graph(event["viewport"], ws.send_json, active_inquiry.uuid, True)
                        await ws.send_json({ "action": "isLoading", "detail": False, "message": "Success! Your graph environment is ready for use." })

        except (WebSocketException, ConnectionClosedError) as e:
            await ws.send_json({"action": "isLoading", "detail": False })
            await ws.close()
            # del graph_users[user_cid]
        except WebSocketDisconnect as e:
            print((
                f"disconnect user -> {user_cid} from all"
                f"http://localhost:3000/graph/inquiry/{hid} users: {graph_users}"
            ))
            del graph_users[user_cid]
        except KeyError:
            pass


@router.post("/transform/")
async def run_entity_transform(
    source_entity: dict,
    _: Annotated[schemas.MemberInDBBase, Depends(deps.get_user_from_session)],
    hid: Annotated[int, Depends(deps.get_graph_id)],
    db: Session = Depends(deps.get_db),
):
    print(source_entity)
    active_inquiry = await crud.graphs.get(db, id=hid)
    print("transforming from: ", source_entity)
    transform_result = None

    async with httpx.AsyncClient() as client:
        print('transforming!')
        response = await client.post("http://plugins:42562/transforms", json=source_entity, timeout=None)
        transform_result = response.json()
        print('transform_result:')
        print(transform_result)

    if transform_result:
        if isinstance(transform_result, list):
            out_result = [await save_entity_transform(tresult, source_entity, active_inquiry.uuid.hex) for tresult in transform_result]
        else:
            out_result = list(await save_entity_transform(transform_result, source_entity, active_inquiry.uuid.hex))
        print('out_result', out_result)
        return out_result
    raise HTTPException(status_code=422, detail="No results.")