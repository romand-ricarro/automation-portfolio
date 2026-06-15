const questions = (questionNumber) => {
    const q = []

    q[0] = ["Name", "Emoji Snapshot 📸: This week, my mood in emojis is...",
        "Target Triumphs 🎯: This week, my goal is...",
        "Epic Encounters ⚔️: The biggest challenge I'm tackling this week is...",
        "Victory Highlights 🏆: My key achievements this week include..."]

    return q[questionNumber - 1];
}

module.exports = questions