QUnit.helpers(this);

function testInit(e) {
  QUnit.urlParams(e.parameter);
  QUnit.config({ title: "Gmail unread notify tests" });
  QUnit.load(tests);
  
  return QUnit.getHtml();
}

function tests() {
  setTestMode(false);
  testGetUnreadMessages();
  testGetTriggers();
  testGetSetEmail();
}
 
function testGetUnreadMessages() {
  QUnit.test("getUnreadMessages() tests", function() {
    GmailApp = {
      getInboxUnreadCount: function() { return 0; },
    };
    deepEqual(getUnreadMessages(), [], "No unread messages");
    
    /*
     * Helper function for following test cases.
     */
    function createMessage(unread, date, from, subject) {
      return {
        isUnread: function() { return unread; },
        getDate: function() { return date; },
        getFrom: function() { return from; },
        getSubject: function() { return subject; },
      }
    };
    
    /*
     * Single thread with 2 unread messages
     */
    var messages = [ createMessage(true, "Monday", "Mr Badger", "missive"),
                     createMessage(false, "Tue", "Unknown", "doesn't matter"),
                     createMessage(true, "Wed", "Bob", "interesting things") ];
    Utilities = { formatDate: function(a, b, c) { return a; } }
    GmailApp = {
      getInboxUnreadCount: function() {
        return messages.reduce(function(total, message) {
          return message.isUnread() ? total + 1 : total;
        }, 0);
      },
      getInboxThreads: function(start, max) {
        return (start == 0) ? [ { getMessages: function() { return messages; } } ] : [];
      },
    };
    deepEqual(getUnreadMessages(),
              [ { date: "Monday", from: "Mr Badger", subject: "missive" },
                { date: "Wed", from: "Bob", subject: "interesting things" }],
              "Single thread with 2 unread messages");
    
    /*
     * Chunking (55 threads)
     */
    var calls = [];
    GmailApp = {
      getInboxUnreadCount: function() { return 2; },
      getInboxThreads: function(start, max) {
        calls.push({ start: start, max: max });
        function createThread() {
          return {
            getMessages: function() {
              return [ createMessage(true, "Fri", "Person", "bilge") ];
            }
          };
        };
        
        /*
         * Return 5 more on second iteration
         */
        if (start != 0) max = 5;
        var threads = [];
        for (var i = 0; i < max; i++) {
          threads.push(createThread());
        }
        return threads;
      },
    };
    equal(getUnreadMessages().length, 55,
          "Two chunks with total 55 messages");
    deepEqual(calls, [ { start: 0, max: 50 }, { start: 50, max: 50 } ],
              "Two chunks with 2 calls to GmailApp.getInboxThreads()");
   });
}

function testGetTriggers() {
  QUnit.test("getTriggers() tests", function() {
    ScriptApp = {
      getProjectTriggers: function() { return 0; },
    };
    deepEqual(getTriggers(), [], "No triggers");
    
    ScriptApp = {
      EventType: { CLOCK: 1 },
      getProjectTriggers: function() {
        function createTrigger(id, type, func) {
          return {
            getUniqueId: function() { return id; },
            getEventType: function() { return type; },
            getHandlerFunction: function() { return func; },
          };
        };
        return [ createTrigger(123, 1, "dummyFunc"),
                 createTrigger(456, 2, "anotherFunc") ];
      },
    };
    deepEqual(getTriggers(),
              [ { id: 123, type: "CLOCK", handler: "dummyFunc" },
                { id: 456, type: "non-CLOCK", handler: "anotherFunc" } ],
              "Two triggers (one time-driven)");
  });
}

function testGetSetEmail() {
  QUnit.test("getEmail() and setEmail() tests", function() {
    var calls = [];
    PropertiesService = {
      userProperties: {
        email: "value",
        getProperty: function(key) { if (key === "EMAIL") return this.email; },
        setProperty: function(key, value) {
          calls.push({ key: key, value: value });
          if (key === "EMAIL") this.email = value;
        },
      },
      getUserProperties: function() { return this.userProperties },
    };
    equal(getEmail(), "value", "Get email");
    
    setEmail("value");
    deepEqual(calls, []);
    equal(getEmail(), "value", "Get email after no-op change");
      
    setEmail("badger");
    deepEqual(calls, [ { key: "EMAIL", value: "badger" } ]);
    equal(getEmail(), "badger", "Get email after real change");
  });
}