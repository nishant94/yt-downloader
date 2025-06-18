import logging
import os
from logging.handlers import RotatingFileHandler

LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

log_formatter = logging.Formatter("%(asctime)s %(levelname)s: %(message)s")

console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)

error_file_handler = RotatingFileHandler(
    os.path.join(LOG_DIR, "error.log"), maxBytes=5 * 1024 * 1024, backupCount=2
)
error_file_handler.setLevel(logging.ERROR)
error_file_handler.setFormatter(log_formatter)

all_file_handler = RotatingFileHandler(
    os.path.join(LOG_DIR, "all.log"), maxBytes=10 * 1024 * 1024, backupCount=2
)
all_file_handler.setFormatter(log_formatter)

logger = logging.getLogger("yt_downloader")
logger.setLevel(logging.DEBUG)
logger.addHandler(console_handler)
logger.addHandler(error_file_handler)
logger.addHandler(all_file_handler)
