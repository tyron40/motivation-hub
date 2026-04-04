import requests

BASE = "https://motivation-hub-iota.vercel.app"

def run_post(name, endpoint, payload):
    try:
        r = requests.post(f"{BASE}{endpoint}", json=payload, timeout=30)
        snippet = r.text[:260].replace("\n", " ")
        print(f"{name}: {r.status_code} | {snippet}")
    except Exception as e:
        print(f"{name}: EXCEPTION | {e}")

def run_options(endpoint):
    try:
        r = requests.options(
            f"{BASE}{endpoint}",
            headers={
                "Origin": "http://localhost:8081",
                "Access-Control-Request-Method": "POST",
            },
            timeout=30,
        )
        print(
            f"OPTIONS {endpoint}: {r.status_code} | "
            f"ACAO={r.headers.get('access-control-allow-origin')} | "
            f"ACAM={r.headers.get('access-control-allow-methods')}"
        )
    except Exception as e:
        print(f"OPTIONS {endpoint}: EXCEPTION | {e}")

if __name__ == "__main__":
    print("=== HAPPY PATHS ===")
    run_post("youtube_category_ok", "/api/youtube/category", {"category": "motivation", "maxResults": 5})
    run_post("youtube_search_ok", "/api/youtube/search", {"query": "motivation", "maxResults": 5})
    run_post("youtube_trending_ok", "/api/youtube/trending", {"maxResults": 5})

    print("\n=== ERROR / EDGE CASES ===")
    run_post("youtube_category_missing", "/api/youtube/category", {})
    run_post("youtube_category_edge_zero", "/api/youtube/category", {"category": "motivation", "maxResults": 0})
    run_post("youtube_search_missing", "/api/youtube/search", {})
    run_post("youtube_search_edge_long", "/api/youtube/search", {"query": "motivation " * 60, "maxResults": 1})
    run_post("youtube_trending_edge_zero", "/api/youtube/trending", {"maxResults": 0})
    run_post("chat_minimal", "/api/chat", {"message": "hello"})
    run_post("tts_minimal", "/api/tts", {"text": "hello"})

    print("\n=== CORS / OPTIONS ===")
    for ep in ["/api/youtube/category", "/api/youtube/search", "/api/youtube/trending", "/api/chat", "/api/tts"]:
        run_options(ep)
