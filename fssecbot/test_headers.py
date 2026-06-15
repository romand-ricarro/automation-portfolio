from google_sheets import GoogleSheetsClient

def main():
    try:
        sheets_client = GoogleSheetsClient()
        worksheet = sheets_client.bulletin_sheet.worksheet("📌Bulletin Board")
        headers = worksheet.row_values(1)  # Fetch Row 1
        print("Headers in 📌Bulletin Board:")
        for idx, header in enumerate(headers, start=1):
            print(f"Column {idx}: '{header}'")
        
        # Check for duplicates
        if len(headers) != len(set(headers)):
            print("\nDuplicate headers found:")
            duplicates = set([x for x in headers if headers.count(x) > 1])
            for dup in duplicates:
                print(f"'{dup}'")
        else:
            print("\nAll headers are unique.")
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
