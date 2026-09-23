import csv
import gzip
import json
import urllib.request
from collections import defaultdict

BASE_URL = "https://datasets.imdbws.com/"

FILES = {
    "basics": "title.basics.tsv.gz",
    "akas": "title.akas.tsv.gz"
}

OUTPUT_FILE = "movies.js"

print("Downloading IMDb movie data...")
print("This can take some time because the IMDb files are large.")

def download_file(filename):
    url = BASE_URL + filename
    local_file = filename

    print(f"\nDownloading: {filename}")

    urllib.request.urlretrieve(url, local_file)

    print(f"Downloaded: {filename}")
    return local_file


# --------------------------------------------------
# STEP 1 - Download IMDb title basics
# --------------------------------------------------

basics_file = download_file(FILES["basics"])


# --------------------------------------------------
# STEP 2 - Download IMDb alternate titles
# --------------------------------------------------

akas_file = download_file(FILES["akas"])


# --------------------------------------------------
# Indian language codes
# --------------------------------------------------

LANGUAGES = {
    "hi": "hindi",
    "ta": "tamil",
    "te": "telugu",
    "ml": "malayalam",
    "kn": "kannada"
}


# --------------------------------------------------
# Store Indian language information
# --------------------------------------------------

language_map = defaultdict(set)

print("\nReading IMDb language information...")

with gzip.open(akas_file, "rt", encoding="utf-8") as file:

    reader = csv.DictReader(file, delimiter="\t")

    for row in reader:

        title_id = row["titleId"]
        language = row["language"]

        if language in LANGUAGES:
            language_map[title_id].add(LANGUAGES[language])


# --------------------------------------------------
# Read movies
# --------------------------------------------------

movies = {
    "bollywood": [],
    "south": [],
    "tamil": [],
    "telugu": [],
    "malayalam": [],
    "kannada": []
}

print("\nReading movie database...")

with gzip.open(basics_file, "rt", encoding="utf-8") as file:

    reader = csv.DictReader(file, delimiter="\t")

    for row in reader:

        title_id = row["tconst"]

        if row["titleType"] != "movie":
            continue

        if title_id not in language_map:
            continue

        try:
            year = int(row["startYear"])
        except:
            continue

        if year < 1900:
            continue

        title = row["primaryTitle"]

        if not title:
            continue

        movie = {
            "id": title_id,
            "title": title,
            "year": year
        }

        languages = language_map[title_id]

        # ------------------------------------------
        # Language categories
        # ------------------------------------------

        if "tamil" in languages:
            movies["tamil"].append(movie)

        if "telugu" in languages:
            movies["telugu"].append(movie)

        if "malayalam" in languages:
            movies["malayalam"].append(movie)

        if "kannada" in languages:
            movies["kannada"].append(movie)

        # ------------------------------------------
        # South Indian
        # ------------------------------------------

        if (
            "tamil" in languages
            or "telugu" in languages
            or "malayalam" in languages
            or "kannada" in languages
        ):
            movies["south"].append(movie)

        # ------------------------------------------
        # Hindi / Bollywood
        # ------------------------------------------

        if "hindi" in languages:
            movies["bollywood"].append(movie)


# --------------------------------------------------
# Remove duplicate movies
# --------------------------------------------------

for category in movies:

    unique = {}

    for movie in movies[category]:
        unique[movie["id"]] = movie

    movies[category] = list(unique.values())


# --------------------------------------------------
# Sort newest first
# --------------------------------------------------

for category in movies:

    movies[category].sort(
        key=lambda movie: movie["year"],
        reverse=True
    )


# --------------------------------------------------
# Create JavaScript file
# --------------------------------------------------

with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8"
) as file:

    file.write(
        "const MOVIE_DATABASE = "
    )

    json.dump(
        movies,
        file,
        ensure_ascii=False,
        indent=2
    )

    file.write(";\n")


# --------------------------------------------------
# Show results
# --------------------------------------------------

print("\n======================================")
print("MOVIE DATABASE CREATED")
print("======================================")

for category in movies:

    print(
        f"{category}: "
        f"{len(movies[category])} movies"
    )

print("\nCreated file:")
print(OUTPUT_FILE)

print("\nDone!")
