const { google } = require('googleapis');

const googleSheetApi = async (spreadsheetId, range, values) => {
    // Authenticate to google API
    const auth = new google.auth.GoogleAuth({
        keyFile: "creds.json",
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const authClient = await auth.getClient();

    // Google Sheet instance
    const googleSheet = google.sheets({ version: "v4", auth: authClient });

    await googleSheet.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [values],
            majorDimension: "ROWS"
        }
    })
}

module.exports = googleSheetApi