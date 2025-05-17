import requests
import yaml

rss_url = "https://rss.app/feeds/v1.1/BxoIhlCmllHHq29D.json"

response = requests.get(rss_url)
rss_data = response.json()

items = rss_data.get('items', [])[:10]  # Get top 10

with open('_data/rss.yml', 'w') as f:
    yaml.dump(items, f, allow_unicode=True)
