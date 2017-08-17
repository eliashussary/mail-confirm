# MailConfirm
A Node Js API for three stage email validation including the following;
* email pattern validation,
* MX mail server existence,
* mailbox existence.

*NOTE: True mailbox existence may only be performed, with certainty, by sending a verification email and having the user verify their email.*

## Install
```sh
# yarn
yarn add mail-confirm
# npm
npm i mail-confirm
```

## Usage
#### Usage Notes
* Ensure you execute this in an environment where SMTP port 25 is accessible. Failing to do so will throw error *Mailbox check failed*.
* Internal instance methods are exposed as Static methods. If you wish to build your own email verification routine, or only require one of these staged methods, simply call MailConfirm.[methodName]. *See API Documentation below.*
```Javascript
import MailConfirm from 'mail-confirm'

// promises
const email = new MailConfirm({
    emailAddress: 'test@gmail.com',
    timeout: 2000,
    mailFrom: 'my@email.com',
    invalidMailboxKeywords: ['noreply', 'noemail']
})

email.check().then(console.log).catch(console.log)

// async/await
const check = async (emailAddress) => {
    try{
        const email = new MailConfirm({ emailAddress })
        const result = await email.check()
        return result
    }catch(err){
        throw new Error(err)
    }
}

check('test@gmail.com')
/*
output => 
    { emailAddress: 'test@gmail.com',
    timeout: 2000,
    invalidMailboxKeywords: [],
    mailFrom: 'my@email.com',
    mailbox: 'test',
    hostname: 'gmail.com',
    mxRecords:
    [ { exchange: 'gmail-smtp-in.l.google.com', priority: 5 },
        { exchange: 'alt1.gmail-smtp-in.l.google.com', priority: 10 },
        { exchange: 'alt2.gmail-smtp-in.l.google.com', priority: 20 },
        { exchange: 'alt3.gmail-smtp-in.l.google.com', priority: 30 },
        { exchange: 'alt4.gmail-smtp-in.l.google.com', priority: 40 } ],
    smtpMessages:
    [ { command: 'HELO gmail-smtp-in.l.google.com',
        message: '220 mx.google.com ESMTP n6si1346674qtk.310 - gsmtp\r\n',
        status: 220 },
        { command: 'MAIL FROM: <email@example.org>',
        message: '250 mx.google.com at your service\r\n',
        status: 250 },
        { command: 'RCPT TO: <test@gmail.com>',
        message: '250 2.1.0 OK n6si1346674qtk.310 - gsmtp\r\n',
        status: 250 } ],
    isValidPattern: true,
    isValidMx: true,
    isValidMailbox: true,
    result: 'Mailbox is valid.' }
  */
  ```



## API Documentation

<a name="MailConfirm"></a>

## MailConfirm
**Kind**: global class

* [MailConfirm](#MailConfirm)
    * [new MailConfirm(config)](#new_MailConfirm_new)
    * _instance_
        * [.check()](#MailConfirm+check) ⇒ <code>Object</code>
    * _static_
        * [.resolvePattern(emailAddress, [invalidMailboxKeywords])](#MailConfirm.resolvePattern) ⇒ <code>boolean</code>
        * [.resolveMx(hostname)](#MailConfirm.resolveMx) ⇒ <code>Array.&lt;Object&gt;</code>
        * [.resolveSmtpMailbox(config)](#MailConfirm.resolveSmtpMailbox) ⇒ <code>Array.&lt;object&gt;</code>

<a name="new_MailConfirm_new"></a>

### new MailConfirm(config)
Email address validation and SMTP verification API.


| Param | Type | Description |
| --- | --- | --- |
| config | <code>Object</code> | The email address you want to validate. |
| config.emailAddress | <code>string</code> | The email address you want to validate. |
| [config.mailFrom] | <code>string</code> | The email address used for the mail from during SMTP mailbox validation. |
| [config.invalidMailboxKeywords] | <code>Array.&lt;string&gt;</code> | Keywords you want to void, i.e. noemail, noreply etc. |
| [config.timeout] | <code>number</code> | The timeout parameter for SMTP mailbox validation. |

<a name="MailConfirm+check"></a>

### mailConfirm.check() ⇒ <code>Object</code>
Runs the email validation routine and supplies a final result.

**Kind**: instance method of [<code>MailConfirm</code>](#MailConfirm)
**Returns**: <code>Object</code> - - The instance state object containing all of the isValid* boolean checks, MX Records, and SMTP Messages.

<a name="MailConfirm.resolvePattern"></a>

### MailConfirm.resolvePattern(emailAddress, [invalidMailboxKeywords]) ⇒ <code>boolean</code>
Determines if the email address pattern is valid based on regex and invalid keyword check.

**Kind**: static method of [<code>MailConfirm</code>](#MailConfirm)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| emailAddress | <code>string</code> |  | The full email address ypu want to check. |
| [invalidMailboxKeywords] | <code>Array.&lt;string&gt;</code> | <code>[]</code> | An array of keywords to invalidate your check, ie. noreply
, noemail, etc. |

<a name="MailConfirm.resolveMx"></a>

### MailConfirm.resolveMx(hostname) ⇒ <code>Array.&lt;Object&gt;</code>
Wrap of dns.resolveMx native method.

**Kind**: static method of [<code>MailConfirm</code>](#MailConfirm)
**Returns**: <code>Array.&lt;Object&gt;</code> - - Returns MX records array { priority, exchange }

| Param | Type | Description |
| --- | --- | --- |
| hostname | <code>string</code> | The hostname you want to resolve, i.e. gmail.com |

<a name="MailConfirm.resolveSmtpMailbox"></a>

### MailConfirm.resolveSmtpMailbox(config) ⇒ <code>Array.&lt;object&gt;</code>
Runs the SMTP mailbox check. Commands for HELO/EHLO, MAIL FROM, RCPT TO.

**Kind**: static method of [<code>MailConfirm</code>](#MailConfirm)
**Returns**: <code>Array.&lt;object&gt;</code> - - Object of SMTP responses [ {command, status, message} ]

| Param | Type | Description |
| --- | --- | --- |
| config | <code>Object</code> | Object of parameters for Smtp Mailbox resolution. |
| config.emailAddress | <code>string</code> | The email address you want to check. |
| config.mxRecords | <code>Array.&lt;object&gt;</code> | The MX Records array supplied from resolveMx. |
| config.timeout | <code>number</code> | Timeout parameter for the SMTP routine. |
| config.mailFrom | <code>string</code> | The email address supplied to the MAIL FROM SMTP command. |

<a name="resolveMx"></a>

**Title**: MailConfirm    
**Author**: Elias Hussary <eliashussary@gmail.com>    
**License**: MIT    
**Copyright**: (C) 2017 Elias Hussary