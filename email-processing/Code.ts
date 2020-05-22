function getGmailData() {
  var sheet: GoogleAppsScript.Spreadsheet.Sheet = SpreadsheetApp.getActiveSheet();
  
  //var unreadThreads: GoogleAppsScript.Gmail.GmailThread[] = GmailApp.search("in:trash -{:label:inbox.checked}");
  var unreadThreads: GoogleAppsScript.Gmail.GmailThread[] = GmailApp.search("is:unread in:inbox");
  if (unreadThreads.length > 0) {

    unreadThreads.forEach((threadItem: GoogleAppsScript.Gmail.GmailThread) => {
      threadItem.getMessages().forEach((msgItem: GoogleAppsScript.Gmail.GmailMessage) => {

        let mailParser = new MailParser(msgItem);
        sheet.appendRow([new Date(), msgItem.getDate(), msgItem.getId(), mailParser.fromName, mailParser.fromAddress, mailParser.toAddress, msgItem.getSubject(), msgItem.getPlainBody(), msgItem.getBody()]);

        Slack.postToSlack(
          mailParser.fromAddress + "\n"
          + msgItem.getDate() + "\n"
          + mailParser.toAddress + "\n"
          + msgItem.getSubject()
        );

        threadItem.moveToArchive();
        threadItem.addLabel(GmailApp.getUserLabelByName(Config.GMAIL_INBOX_CHECKED_LABEL_NAME));
        msgItem.markRead();
      })
    });
  }
}