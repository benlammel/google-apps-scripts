//https://medium.com/expedia-group-tech/how-to-make-a-slackbot-using-google-scripts-2a5e9344898
//https://api.slack.com/docs/messages/builder?msg=%7B%22text%22%3A%22This%20is%20a%20line%20of%20text.%5CnAnd%20this%20is%20another%20one.%22%7D
class Slack {

    static postToSlack(messageText: string) {

        let payload: GoogleAppsScript.URL_Fetch.Payload = {
            "channel": Config.SLACK_NOTIFICATION_CHANNEL,
            "username": Config.SLACK_NOTIFICATION_USERNAME,
            "icon_url": "",
            "text": messageText
        }

        let options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
            "method": "post",
            "contentType": "application/json",
            "payload": JSON.stringify(payload)
        };

        return UrlFetchApp.fetch(Config.SLACK_NOTIFICATION_WEBHOOK, options);
    }
}