# logger.py
import logging
import os

def setup_logger():
    """
    Sets up a logger that logs messages to both the console and a file.
    Returns:
        logger (logging.Logger): Configured logger instance.
    """
    logger = logging.getLogger('discord_bot')
    logger.setLevel(logging.INFO)
    
    # Prevent adding multiple handlers if logger already has them
    if not logger.handlers:
        # Create handlers
        console_handler = logging.StreamHandler()
        file_handler = logging.FileHandler('discord_bot.log')
        
        # Set levels for handlers
        console_handler.setLevel(logging.INFO)
        file_handler.setLevel(logging.INFO)
        
        # Create formatters and add them to handlers
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        console_handler.setFormatter(formatter)
        file_handler.setFormatter(formatter)
        
        # Add handlers to the logger
        logger.addHandler(console_handler)
        logger.addHandler(file_handler)
    
    return logger
