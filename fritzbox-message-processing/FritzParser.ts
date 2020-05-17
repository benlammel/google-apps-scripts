interface ParseConfiguration {
    configPointer: number
}

interface DataVolume {
    amount: number
    unit: string
}

interface DSLInformation {
    centralExchange: string,
    version: string,
    throughput: {
        receive: DataVolume,
        send: DataVolume
    },
    lineAttenuation: {
        receive: DataVolume,
        send: DataVolume
    },
    SignalToNoiseRatio: {
        receive: DataVolume,
        send: DataVolume
    }
}

interface Configuration {
    product: string,
    osVersion: string,
    powerConsumption: number,
    lastRestart: Date
}

interface OnlineCounter {
    yesterdaySum: DataVolume,
    yesterdaySent: DataVolume,
    yesterdayReceived: DataVolume,

    lastWeekSum: DataVolume,
    lastWeekSent: DataVolume,
    lastWeekReceived: DataVolume,

    lastMonthSum: DataVolume,
    lastMonthSent: DataVolume,
    lastMonthReceived: DataVolume
}

interface FritzReport {
    dateTime: Date,
    receiver: string,
    configuration: Configuration,
    onlineCounter: OnlineCounter,
    dslInformation: DSLInformation
}

class FritzParser {
    mail: GoogleAppsScript.Gmail.GmailMessage;
    report: FritzReport;
    regexNumber = new RegExp(/(\d+(\.\d+)?)/g);
    parseConfig: ParseConfiguration;

    constructor(mail: GoogleAppsScript.Gmail.GmailMessage) {
        this.mail = mail;

        this.report = {
            dateTime: new Date(null),
            receiver: this.parseAddress(this.mail.getTo()),
            onlineCounter: {
                yesterdaySum: { amount: 0, unit: '' },
                yesterdaySent: { amount: 0, unit: '' },
                yesterdayReceived: { amount: 0, unit: '' },
                lastWeekSum: { amount: 0, unit: '' },
                lastWeekSent: { amount: 0, unit: '' },
                lastWeekReceived: { amount: 0, unit: '' },
                lastMonthSum: { amount: 0, unit: '' },
                lastMonthSent: { amount: 0, unit: '' },
                lastMonthReceived: { amount: 0, unit: '' }
            },

            dslInformation: {
                centralExchange: '',
                version: '',
                throughput: {
                    receive: { amount: 0, unit: '' },
                    send: { amount: 0, unit: '' }
                },
                lineAttenuation: {
                    receive: { amount: 0, unit: '' },
                    send: { amount: 0, unit: '' }
                },
                SignalToNoiseRatio: {
                    receive: { amount: 0, unit: '' },
                    send: { amount: 0, unit: '' }
                }
            },

            configuration: {
                product: '',
                osVersion: '',
                powerConsumption: -1,
                lastRestart: new Date(null)
            }
        }

        console.log("processing ", this.report.receiver, " : ", mail.getSubject())

        this.parseConfig = {
            configPointer: -1
        }

        this.performParsing();
        //this.printReport();
        this.writeToSheet();
    }

    performParsing() {
        let htmlInput = '<!DOCTYPE test [ <!ENTITY nbsp \"&#160;\"> ]>' + this.mail.getBody();

        htmlInput = htmlInput.replace(/<!DOCTYPE html>/g, '')
            .replace('<meta http-equiv=\"content-type\" content=\"text/html;charset=utf-8\" class=\"\">', '')
            .replace('<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\">', '')
            .replace(/( class=""|<img .*>|<hr.*>)+/g, '')
            .replace(/(<br>|<br class="Apple-interchange-newline">|<br class=""Apple-interchange-newline"">)/g, '<br/>')
            //.replace(/<td.*>  \n<\/tr>/g, '</tr>');


        //console.log("***** ", htmlInput);

        let doc: GoogleAppsScript.XML_Service.Document;
        try {
            doc = XmlService.parse(htmlInput)
        } catch (e) {
            this.testWrite([this.mail.getDate().toDateString(), this.mail.getBody(), htmlInput]);
            throw ("error prasing htmlInput " + e);
        }

        if (this.report.receiver === Config.MAIL_BIN18) {
            this.parseConfig.configPointer = 10
        } else {
            this.parseConfig.configPointer = 9
        }

        this.parseConfiguration(doc.getRootElement().getChildren());
        this.parseOnlineCounter(doc.getRootElement().getChildren());
        this.parseDSLInfo(doc.getRootElement().getChildren());
    }

    parseAddress(address: string): string {
        let temp = address.trim().match(/[^@<\s]+@[^@\s>]+/g);
        if (temp) {
            return temp[0];
        } else {
            return "";
        }
    }

    parseConfiguration(elements: GoogleAppsScript.XML_Service.Element[]) {
        try {
            let header = elements[1].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[this.parseConfig.configPointer].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[0];
            this.report.dateTime = this.parseDateTimeString(header.getValue().trim());

            let structure = elements[1].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[this.parseConfig.configPointer].getChildren()[0].getChildren()[0].getChildren()[1].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[0];

            this.report.configuration.product = structure.getChildren()[0].getChildren()[1].getValue().trim();
            this.report.configuration.osVersion = structure.getChildren()[1].getChildren()[1].getValue().trim().trim().match(this.regexNumber)[0];
            this.report.configuration.powerConsumption = parseFloat(structure.getChildren()[10].getChildren()[1].getValue().trim().match(this.regexNumber)[0]);
            this.report.configuration.lastRestart = this.parseDateTimeString(structure.getChildren()[11].getChildren()[1].getValue().trim());
        } catch (e) {
            this.testWrite([this.mail.getDate().toDateString(), e, this.mail.getPlainBody(), this.mail.getBody()]);
            console.log("#2", "couldn't parse ", e)
            Logger.log("#2", "couldn't parse ", e);
        }
    }

    parseDSLInfo(elements: GoogleAppsScript.XML_Service.Element[]) {
        try {
            let structure = elements[1].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[7].getChildren()[0].getChildren()[0].getChildren()[1].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[0];

            if (this.report.configuration.product === Config.FRITZBOX7490) {
                this.report.dslInformation.centralExchange = structure.getChildren()[0].getChildren()[1].getValue().trim();
                this.report.dslInformation.version = structure.getChildren()[1].getChildren()[1].getValue().trim();

                this.report.dslInformation.throughput.receive = this.parseDataSpeed(structure.getChildren()[3].getChildren()[1].getValue().trim());
                this.report.dslInformation.throughput.send = this.parseDataSpeed(structure.getChildren()[3].getChildren()[2].getValue().trim());

                this.report.dslInformation.lineAttenuation.receive = this.parseRatio(structure.getChildren()[4].getChildren()[1].getValue().trim());
                this.report.dslInformation.lineAttenuation.send = this.parseRatio(structure.getChildren()[4].getChildren()[2].getValue().trim());

                this.report.dslInformation.SignalToNoiseRatio.receive = this.parseRatio(structure.getChildren()[5].getChildren()[1].getValue().trim());
                this.report.dslInformation.SignalToNoiseRatio.send = this.parseRatio(structure.getChildren()[5].getChildren()[2].getValue().trim());

            } else {
                this.report.dslInformation.throughput.receive = this.parseDataSpeed(structure.getChildren()[0].getChildren()[1].getValue().trim());
                this.report.dslInformation.throughput.send = this.parseDataSpeed(structure.getChildren()[0].getChildren()[2].getValue().trim());
            }

        } catch (e) {
            console.log("#1", "couldn't parse ", e)
            Logger.log("#1", "couldn't parse ", e);
        }

    }

    parseOnlineCounter(elements: GoogleAppsScript.XML_Service.Element[]) {
        //body      table               tr              td              table           tr              td                  table              tr           td              table              tr               td              table               tr      
        let temp = elements[1].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[6].getChildren()[0].getChildren()[0].getChildren()[2].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[0];

        this.report.onlineCounter.yesterdaySum = this.parseDataVolume(temp.getChildren()[2].getChildren()[2].getValue());
        this.report.onlineCounter.yesterdaySent = this.parseDataVolume(temp.getChildren()[2].getChildren()[3].getValue());
        this.report.onlineCounter.yesterdayReceived = this.parseDataVolume(temp.getChildren()[2].getChildren()[4].getValue());

        this.report.onlineCounter.lastWeekSum = this.parseDataVolume(temp.getChildren()[4].getChildren()[2].getValue());
        this.report.onlineCounter.lastWeekSent = this.parseDataVolume(temp.getChildren()[4].getChildren()[3].getValue());
        this.report.onlineCounter.lastWeekReceived = this.parseDataVolume(temp.getChildren()[4].getChildren()[4].getValue());

        this.report.onlineCounter.lastMonthSum = this.parseDataVolume(temp.getChildren()[6].getChildren()[2].getValue());
        this.report.onlineCounter.lastMonthSent = this.parseDataVolume(temp.getChildren()[6].getChildren()[3].getValue());
        this.report.onlineCounter.lastMonthReceived = this.parseDataVolume(temp.getChildren()[6].getChildren()[4].getValue());
    }

    parseDateTimeString(inputString: string): Date {
        let result = new Date(null);
        try {
            let regexDate = new RegExp(/((0[1-9]|[12]\d|3[01])\.(0[1-9]|1[0-2])\.[12]\d{3})/);
            let date = inputString.match(regexDate)[0].split(".");

            let regexTime = new RegExp(/([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?/);
            let time = inputString.match(regexTime)[0].split(":");

            let result: Date = new Date(date[1] + "/" + date[0] + "/" + date[2]);
            result.setHours(parseInt(time[0]));
            result.setMinutes(parseInt(time[1]));
            if (time[2] !== undefined) {
                result.setSeconds(parseInt(time[2]));
            }
        } catch (e) {
            Logger.log("#3", "error in parseDateTimeString. input: ", inputString, " error ", e);
        }
        return result;

    }

    parseDataVolume(value: string): DataVolume {
        let regexUnit = new RegExp(/(KB|MB|GB)/g);

        let result: DataVolume = {
            amount: parseFloat(value.trim().match(this.regexNumber)[0]),
            unit: value.trim().match(regexUnit)[0]
        }

        if (result.unit === 'MB') {
            result.amount = result.amount / 1000;
            result.unit = 'GB'
        } else if (result.unit === 'KB') {
            result.amount = result.amount / 1000 / 1000;
            result.unit = 'KB'
        }

        return result;
    }

    parseDataSpeed(value: string): DataVolume {
        let regexUnit = new RegExp(/(kbit\/s|Mbit\/s|Gbit\/s)/g);
        let result: DataVolume = {
            amount: parseFloat(value.trim().match(this.regexNumber)[0]),
            unit: value.trim().match(regexUnit)[0]
        }
        return result;
    }

    parseRatio(value: string): DataVolume {
        let regexUnit = new RegExp(/(dB)/g);
        let result: DataVolume = {
            amount: parseFloat(value.trim().match(this.regexNumber)[0]),
            unit: value.trim().match(regexUnit)[0]
        }
        return result;
    }

    printReport() {

        console.log('############\n',
            '\ndateTime: ', this.report.dateTime,
            '\nreceiver: ', this.report.receiver, '\n',
            JSON.stringify(this.report.onlineCounter), "\n -----\n",
            JSON.stringify(this.report.dslInformation), "\n -----\n",
            JSON.stringify(this.report.configuration)
        );
    }

    testWrite(dataToWrite: string[]) {
        let sheet: GoogleAppsScript.Spreadsheet.Sheet = SpreadsheetApp.getActiveSheet();
        sheet.appendRow(dataToWrite);
    }

    writeToSheet() {
        let sheet: GoogleAppsScript.Spreadsheet.Sheet = SpreadsheetApp.getActiveSheet();
        let column: number = 1;

        let columnValues = sheet.getRange(2, column, sheet.getLastRow()).getValues();
        let searchResult: number = columnValues.findIndex((value: any, test2: any) => value[0] === this.mail.getId());

        let dataToWrite = [
            this.mail.getId(),
            this.mail.getDate(),
            this.report.dateTime,
            this.report.receiver,
            this.report.configuration.product,
            this.report.configuration.osVersion,
            this.report.configuration.powerConsumption,
            this.report.configuration.lastRestart,
            this.report.onlineCounter.yesterdaySent.amount,
            this.report.onlineCounter.yesterdaySent.unit,
            this.report.onlineCounter.yesterdayReceived.amount,
            this.report.onlineCounter.yesterdayReceived.unit,
            this.report.onlineCounter.yesterdaySum.amount,
            this.report.onlineCounter.yesterdaySum.unit,
            this.report.onlineCounter.lastWeekSent.amount,
            this.report.onlineCounter.lastWeekSent.unit,
            this.report.onlineCounter.lastWeekReceived.amount,
            this.report.onlineCounter.lastWeekReceived.unit,
            this.report.onlineCounter.lastWeekSum.amount,
            this.report.onlineCounter.lastWeekSum.unit,
            this.report.onlineCounter.lastMonthSent.amount,
            this.report.onlineCounter.lastMonthSent.unit,
            this.report.onlineCounter.lastMonthReceived.amount,
            this.report.onlineCounter.lastMonthReceived.unit,
            this.report.onlineCounter.lastMonthSum.amount,
            this.report.onlineCounter.lastMonthSum.unit,
            this.report.dslInformation.version,
            this.report.dslInformation.centralExchange,
            this.report.dslInformation.throughput.send.amount,
            this.report.dslInformation.throughput.send.unit,
            this.report.dslInformation.throughput.receive.amount,
            this.report.dslInformation.throughput.receive.unit,
            this.report.dslInformation.lineAttenuation.send.amount,
            this.report.dslInformation.lineAttenuation.send.unit,
            this.report.dslInformation.lineAttenuation.receive.amount,
            this.report.dslInformation.lineAttenuation.receive.unit,
            this.report.dslInformation.SignalToNoiseRatio.send.amount,
            this.report.dslInformation.SignalToNoiseRatio.send.unit,
            this.report.dslInformation.SignalToNoiseRatio.receive.amount,
            this.report.dslInformation.SignalToNoiseRatio.receive.unit
        ];

        if (searchResult == -1) {
            sheet.appendRow(dataToWrite)
        } else {

            /*
            let counter: number = 1;
            dataToWrite.forEach((item: any)=> {
                sheet.getRange(searchResult + 2, counter++).setValue(item);
            })*/
        }
    }

}