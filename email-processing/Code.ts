function getGmailData() {
  var sheet: GoogleAppsScript.Spreadsheet.Sheet = SpreadsheetApp.getActiveSheet();
  //var unreadThreads: GoogleAppsScript.Gmail.GmailThread[] = GmailApp.search("is:unread in:inbox");
  var unreadThreads: GoogleAppsScript.Gmail.GmailThread[] = GmailApp.search("to:(lemming.bot+de-lau14@gmail.com) subject:(\"FRITZ!Box-Info: Nutzungs- und Verbindungsdaten vom 14.05.2020\")");

  if (unreadThreads.length > 0) {

    unreadThreads.forEach((threadItem: GoogleAppsScript.Gmail.GmailThread) => {
      threadItem.getMessages().forEach((msgItem: GoogleAppsScript.Gmail.GmailMessage) => {

        let mailParser = new MailParser(msgItem);
        //sheet.appendRow([new Date(), msgItem.getDate(), msgItem.getId(), mailParser.fromName, mailParser.fromAddress, mailParser.toAddress, msgItem.getSubject(), msgItem.getPlainBody(), msgItem.getBody()]);

        /*
        Slack.postToSlack(
          mailParser.fromAddress + "\n"
          + msgItem.getDate() + "\n"
          + mailParser.toAddress + "\n"
          + msgItem.getSubject()
        );
        */

        



        //msgItem.markRead();
      })
    });
  }
}