import datetime
import pytz

def get_current_week_number():
    uk_timezone = pytz.timezone('Europe/London')
    current_datetime = datetime.datetime.now(uk_timezone)
    current_week_number = current_datetime.isocalendar()[1]
    return current_week_number

if __name__ == "__main__":
    print(f"Current week number: {get_current_week_number()}")
