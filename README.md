# DiscordScraper


#### A node js script to scrape all messages from Discord channels, save them in file and store the file in AWS S3 bucket

* **You will need to set following environment variables**

    1. DISCORD_TOKEN -> Discord token for authentication
    1. BUCKET -> Name of the AWS S3 bucket
    1. AWS_ACCESS_KEY -> AWS access key
    1. AWS_SECRET_ACCESS_KEY -> AWS secret key
    1. CALL_INTERVAL [Optional] -> Interval at which the script will run to check for new messages
