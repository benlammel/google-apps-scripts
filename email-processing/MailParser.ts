

class MailParser {
    mail: GoogleAppsScript.Gmail.GmailMessage ;
    fromAddress: string;
    fromName: string;
    toAddress: string;

    constructor(mail: GoogleAppsScript.Gmail.GmailMessage) {
        this.mail = mail;
        this.fromAddress = this.extractAddress(mail.getFrom());
        this.fromName = this.extractName(mail.getFrom());
        this.toAddress = this.extractAddress(mail.getTo());
    }

    extractName(address: string): string {
        let temp = address.trim().split(/\s+/);

        if (temp.length > 1) {
            temp.pop();
            return temp.join(" ").replace(/"/g, "");
          } else {
              return "";
          }
    }

    extractAddress(address: string): string {
        let temp = address.trim().match(/[^@<\s]+@[^@\s>]+/g);
        if (temp) {
            return temp[0];
        } else {
            return "";
        }
    }
}