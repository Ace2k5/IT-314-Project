import logging
from pathlib import Path
from io import StringIO
from pathlib import Path

INFO_LOCATION = Path(__file__).parent.parent / "info.log"

def setup_log():
    stringIO = StringIO()
    formatter = logging.Formatter(
        "DATE: {asctime} | LEVEL: {levelname} | MSG: {message}",
        style="{",
        datefmt="%Y - %m - %d - %H:%M"
    )
    console_handler = logging.StreamHandler(stringIO)
    console_handler.setFormatter(formatter)

    file_handler = logging.FileHandler(
        Path(__file__).parent.parent / "info.log",
        mode="a",
        encoding="UTF-8"
    )
    file_handler.setFormatter(formatter)

    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)