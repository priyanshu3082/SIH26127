from datetime import datetime
from pathlib import Path
import json
import math
import re
from typing import Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
STATIC = ROOT / 'dashboard'

def load_json(name: str) -> Any:
    with (DATA / name).open(encoding='utf-8') as file:
        return json.load(file)

cameras = load_json('cameras.json')
sightings = load_json('demo_sightings.json')
blacklist = load_json('blacklist.json')
app = FastAPI(title='CitySight ANPR Prototype', version='0.1.0')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])
app.mount('/dashboard', StaticFiles(directory=STATIC), name='dashboard')

def normalize_plate(value: str) -> str:
    return re.sub(r'[^A-Z0-9]', '', value.upper())

def distance_km(first: dict[str, float], second: dict[str, float]) -> float:
    lat_km = (second['latitude'] - first['latitude']) * 111
    lon_km = (second['longitude'] - first['longitude']) * 111 * math.cos(math.radians(first['latitude']))
    return math.sqrt(lat_km ** 2 + lon_km ** 2)

@app.get('/', include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(STATIC / 'index.html')

@app.get('/api/health')
def health() -> dict[str, str]:
    return {'status': 'ok', 'service': 'citysight-anpr', 'mode': 'demo'}

@app.get('/api/cameras')
def get_cameras() -> list[dict[str, Any]]:
    return cameras

@app.get('/api/sightings')
def get_sightings(camera_id: str | None = None, plate: str | None = None) -> list[dict[str, Any]]:
    result = sightings
    if camera_id:
        result = [item for item in result if item['camera_id'] == camera_id]
    if plate:
        normalized = normalize_plate(plate)
        result = [item for item in result if item['plate_text'] == normalized]
    return sorted(result, key=lambda item: item['detected_at'], reverse=True)

@app.get('/api/vehicles/{plate}/trajectory')
def get_trajectory(plate: str) -> dict[str, Any]:
    normalized = normalize_plate(plate)
    events = sorted([item for item in sightings if item['plate_text'] == normalized], key=lambda item: item['detected_at'])
    if not events:
        raise HTTPException(status_code=404, detail='No sightings found for this plate')
    return {'plate': normalized, 'events': events, 'point_count': len(events)}

@app.get('/api/analytics')
def get_analytics() -> dict[str, Any]:
    by_camera = []
    for camera in cameras:
        items = [item for item in sightings if item['camera_id'] == camera['camera_id']]
        by_camera.append({'camera_id': camera['camera_id'], 'name': camera['name'], 'count': len(items), 'unique_vehicles': len({item['plate_text'] for item in items}), 'average_confidence': round(sum(item['confidence'] for item in items) / len(items), 3) if items else 0})
    routes: dict[str, int] = {}
    for plate in {item['plate_text'] for item in sightings}:
        events = sorted([item for item in sightings if item['plate_text'] == plate], key=lambda item: item['detected_at'])
        for first, second in zip(events, events[1:]):
            route = f"{first['camera_id']} -> {second['camera_id']}"
            routes[route] = routes.get(route, 0) + 1
    return {'total_sightings': len(sightings), 'unique_vehicles': len({item['plate_text'] for item in sightings}), 'blacklist_matches': sum(item['plate_text'] in blacklist for item in sightings), 'by_camera': by_camera, 'routes': [{'route': route, 'count': count} for route, count in sorted(routes.items(), key=lambda item: -item[1])]}

@app.get('/api/alerts')
def get_alerts() -> list[dict[str, Any]]:
    return sorted([{'id': f"alert-{item['id']}", 'type': 'BLACKLIST_MATCH', 'severity': blacklist[item['plate_text']]['severity'], 'plate': item['plate_text'], 'camera_id': item['camera_id'], 'detected_at': item['detected_at'], 'reason': blacklist[item['plate_text']]['reason']} for item in sightings if item['plate_text'] in blacklist], key=lambda item: item['detected_at'], reverse=True)

@app.post('/api/ocr/normalize')
def normalize_ocr(payload: dict[str, str]) -> dict[str, str]:
    raw_text = payload.get('text', '')
    return {'raw_text': raw_text, 'normalized_text': normalize_plate(raw_text)}

@app.get('/api/speed/{plate}')
def estimate_speed(plate: str) -> dict[str, Any]:
    events = get_trajectory(plate)['events']
    segments = []
    for first, second in zip(events, events[1:]):
        first_time = datetime.fromisoformat(first['detected_at'].replace('Z', '+00:00'))
        second_time = datetime.fromisoformat(second['detected_at'].replace('Z', '+00:00'))
        hours = max((second_time - first_time).total_seconds() / 3600, 1 / 3600)
        kilometres = distance_km(first, second)
        segments.append({'from': first['camera_id'], 'to': second['camera_id'], 'distance_km': round(kilometres, 2), 'speed_kmh': round(kilometres / hours, 1)})
    return {'plate': normalize_plate(plate), 'segments': segments}
