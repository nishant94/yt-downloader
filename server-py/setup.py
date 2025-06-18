from setuptools import setup, find_packages

setup(
    name="youtube_video_downloader",
    version="0.1.0",
    description="A FastAPI server to download YouTube videos using yt-dlp.",
    author="Nishant",
    packages=find_packages(include=["controllers*", "services*", "routes*", "logs*"]),
    install_requires=["fastapi", "uvicorn[standard]", "yt-dlp"],
)
