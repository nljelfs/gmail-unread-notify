/**
 * Store in persistent PropertiesService whether the script is in test mode
 * (and so returns dummy data)
 * @param {string} testMode true/false.
 */
function setTestMode(testMode) {
  var userProperties = PropertiesService.getUserProperties();
  var oldTestMode = userProperties.getProperty("TEST_MODE");
  if (testMode && oldTestMode !== "true") {
    userProperties.setProperty("TEST_MODE", "true");
    console.log("Set test mode");
  } else if (!testMode && oldTestMode === "true") {
    userProperties.deleteProperty("TEST_MODE");
    console.log("Unset test mode");
  }
}

function getTestMode() {
  var userProperties = PropertiesService.getUserProperties();
  if (userProperties.getProperty("TEST_MODE") === "true") {
    return true;
  } else {
    return false;
  }
}

/**
 * Send an email with the given subject and body.
 */
function sendEmail(to, subject, body) {
  var cchLogoUrl = "https://www.christchurchharpenden.org.uk/stylesheets/images/c68.jpg";
  var cchLogoBlob = UrlFetchApp.fetch(cchLogoUrl).getBlob().setName("cchLogoBlob");

  MailApp.sendEmail({ to: to,
                      subject: subject,
                      htmlBody: "<img src='cid:cchLogo'> " + body,
                      inlineImages: { cchLogo: cchLogoBlob },
                      noReply: true });
  
  console.log("Sent mail to " + to + ", subject '" + subject + "', body '" + body + "'");
}

/**
 * Send an email notifying about unread messages.
 */
function sendUnreadEmail(unreadMessages) {
  var userProperties = PropertiesService.getUserProperties();
  var me = Session.getActiveUser().getEmail();
  var subject = "✉️ " + unreadMessages.length + " unread message" +
                ((unreadMessages.length == 1) ? "" : "s") + " for " + me; 
  var body = HtmlService.createTemplateFromFile('email').evaluate().getContent();
  
  var to = userProperties.getProperty("EMAIL");
  if (to) {
    sendEmail(to, subject, body);
  } else {
    console.log("No email address set, skipped sending mail " + subject);
  }
}

/**
 * Get array of unread messages.
 */
function getUnreadMessages() {
  var unreadMessages = [];
  
  function formatDate(date) {
    return Utilities.formatDate(date, "GMT", "E dd MMM yyyy HH:mm:ss z")
  }
  
  if (getTestMode()) {
    return [ { date: formatDate(new Date()), from: "Mr Badger", subject: "Badgering around" } ];
  }

  /*
   * Get threads in chunks of 50 in case the Inbox has loads of messages.
   * Build array of unread messages.
   */
  if (GmailApp.getInboxUnreadCount() > 0) {
    var start = 0;
    var max = 50;
    var threads = [];
    var get_threads = true;
    
    while (get_threads) {
      threads = GmailApp.getInboxThreads(start, max);
      for (var i in threads) {
        threads[i].getMessages().forEach(function(message) {
          if (message.isUnread()) {
            unreadMessages.push({ date: formatDate(message.getDate()),
                                  from: message.getFrom(), subject: message.getSubject() });
          }
        });
      }
      if (threads.length == max) {
        start += max;
      } else {
        get_threads = false;
      }
    }
    
    console.log(unreadMessages);
  }
  
  console.info("Return " + unreadMessages.length + " unread messages");
  
  return unreadMessages
}

/**
 * Called by time-driven trigger.
 */
function checkUnreadSendEmail() {
  /*
   * Get unread messages and send a notification email.
   */
  unreadMessages = getUnreadMessages();
  if (unreadMessages.length > 0) {
    sendUnreadEmail(unreadMessages)
  } else {
    console.log("No unread messages in Inbox");
  }
}

/*
 * Build example chart.
 * https://developers.google.com/apps-script/reference/charts/
 */
function buildChart(e) {
  var data = Charts.newDataTable()
      .addColumn(Charts.ColumnType.STRING, 'Month')
      .addColumn(Charts.ColumnType.NUMBER, 'In Store')
      .addColumn(Charts.ColumnType.NUMBER, 'Online')
      .addRow(['January', 10, 1])
      .addRow(['February', 12, 1])
      .addRow(['March', 20, 2])
      .addRow(['April', 25, 3])
      .addRow(['May', 30, 4])
      .build();

  var chart = Charts.newAreaChart()
      .setDataTable(data)
      .setStacked()
      .setRange(0, 40)
      .setTitle('Sales per Month')
      .build();

  var htmlOutput = HtmlService.createHtmlOutput().setTitle('Example Chart');
  var imageData = Utilities.base64Encode(chart.getAs('image/png').getBytes());
  var imageUrl = "data:image/png;base64," + encodeURI(imageData);
  htmlOutput.append("<p>Chart rendered server-side:</p>");
  htmlOutput.append("<img src=\"" + imageUrl + "\" />");
  return htmlOutput;
}

/*
 * Serve HTML page.
 */
function doGet(e) {
  console.log("Script timezone is '" + Session.getScriptTimeZone() + "'");
  
  if (e.parameter["test"]) {
    return testInit(e);
  } else if (e.parameter["chart"] == "1") {
    return buildChart(e);
  }
  
  if (e.parameter["testMode"] == "1") {
    setTestMode(true);
  } else {
    setTestMode(false);
  }
  
  return HtmlService.createTemplateFromFile('index').evaluate()
                    .setTitle("Gmail unread notify web app");
}

/**
 * Get/set email address.
 * @param {string} email The Email address.
 */
function getEmail() {
  if (getTestMode()) {
    return "badger@example.com";
  }
  
  var userProperties = PropertiesService.getUserProperties();
  return userProperties.getProperty("EMAIL");
}

function setEmail(email) {
  if (getTestMode()) {
    return email;
  }
  
  var userProperties = PropertiesService.getUserProperties();
  var oldEmail = userProperties.getProperty("EMAIL");
  if (email != oldEmail) {
    userProperties.setProperty('EMAIL', email);
    console.log("Changed email address " + oldEmail + " -> " + email);
    return email;
  } else {
    console.log("Email address " + email + " unchanged");
  }
}


/**
 * Dummy triggers for test mode.
 */
var testTriggers = [ { id: 0, type: "CLOCK", handler: "badgerHandler" } ];


/**
 * Create a time-driven trigger.
 */
function createTimeDrivenTrigger() {
  if (getTestMode()) {
    for (var i in testTriggers) {
      if (!testTriggers[i]) {
        testTriggers[i] = { id: i, type: "CLOCK", handler: "dummyHandler" + i };
        return i;
      }
    }
    testTriggers.push({ id: testTriggers.length, type: "CLOCK",
                        handler: "dummyHandler" + testTriggers.length });
    return testTriggers.length - 1;
  }

  /*
   * Every day at 5am (in the timezone of the script).
   */
  var trigger = ScriptApp.newTrigger('checkUnreadSendEmail')
                 .timeBased()
                 .atHour(5)
                 .everyDays(1)
                 .create();
  
  console.info("Created time-driven trigger " + trigger.getUniqueId());
  
  return trigger.getUniqueId()
}

/**
 * Delete a trigger.
 * @param {string} triggerId The Trigger ID.
 */
function deleteTrigger(triggerId) {
  if (getTestMode()) {
    if (!testTriggers[triggerId]) {
      return false;
    }
    delete testTriggers[triggerId];
    return true;
  }
  
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i in allTriggers) {
    if (allTriggers[i].getUniqueId() === triggerId) {
      ScriptApp.deleteTrigger(allTriggers[i]);
      console.info("Delete trigger " + triggerId);
      return true;
    }
  }
  
  console.log("Couldn't delete non-existent trigger " + triggerId);
  return false;
}

/**
 * Get project triggers.
 */
function getTriggers() {
  if (getTestMode()) {
    return testTriggers.filter(function(x) { return x });
  }
  
  var triggers = [];
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i in allTriggers) {
    var type = (allTriggers[i].getEventType() == ScriptApp.EventType.CLOCK) ? "CLOCK" : "non-CLOCK";
    triggers.push({ id: allTriggers[i].getUniqueId(), type: type,
                    handler: allTriggers[i].getHandlerFunction() });
  }
  
  console.info("Return " + triggers.length + " triggers");
  return triggers;
}