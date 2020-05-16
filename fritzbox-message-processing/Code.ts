function getGmailData() {

  //var unreadThreads: GoogleAppsScript.Gmail.GmailThread[] = GmailApp.search("is:unread in:inbox");
  var unreadThreads: GoogleAppsScript.Gmail.GmailThread[] = GmailApp.search("subject:(\"FRITZ!Box info: Data on usage and connections\" OR \"FRITZ!Box-Info: Nutzungs- und Verbindungsdaten\" AND NOT label:fritzbox.usage.processed )");

  let mailCounter = 0;
  if (unreadThreads.length > 0) {

    unreadThreads.forEach((threadItem: GoogleAppsScript.Gmail.GmailThread) => {
      threadItem.getMessages().forEach((msgItem: GoogleAppsScript.Gmail.GmailMessage) => {
        let fritzParser = new FritzParser(msgItem);        
      });

      threadItem.addLabel(GmailApp.getUserLabelByName(Config.GMAIL_PROCESSED_LABEL_NAME));
      mailCounter++;
    });
  }

  Logger.log(new Date().toString(), " processed #", mailCounter, " emails");
}