import discord
import datetime

def format_bulletin_embed(entry):
    task = entry.get('TASK', 'N/A')
    details = entry.get('DESCRIPTION', 'N/A')
    priority = entry.get('PRIORITY', 'N/A')
    date_added = entry.get('DATE ADDED', 'N/A')
    due_date = entry.get('DUE DATE', 'N/A')

    embed = discord.Embed(
        title=f"{task}",
        description=details,
        color=0x00ff00,
    )
    embed.add_field(name="PRIORITY", value=priority, inline=False)
    embed.add_field(name="DATE ADDED", value=date_added, inline=True)
    embed.add_field(name="DUE DATE", value=due_date, inline=True)
    
    return embed
