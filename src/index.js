/**
 * @title Check Email  
 * @author Elias Hussary <eliashussary@gmail.com>
 * @license MIT
 * @copyright (C) 2017 Elias Hussary
 */

import { promisify } from 'util'
import dns from 'dns'
import net from 'net'
const resolveMx = promisify(dns.resolveMx)

/**
 * Email address validation and SMTP verification API.

 * @param {Object} config - The email address you want to validate.
 * @param {string} config.emailAddress - The email address you want to validate.
 * @param {string} [config.mailFrom] - The email address used for the mail from during SMTP mailbox validation.
 * @param {string[]} [config.invalidMailboxKeywords] - Keywords you want to void, i.e. noemail, noreply etc.
 * @param {number} [config.timeout] - The timeout parameter for SMTP mailbox validation.
 * @returns {instance}
 * @class MailConfirm
 */
class MailConfirm {
  constructor({ emailAddress, invalidMailboxKeywords, timeout, mailFrom }) {
    this.state = {
      // args
      emailAddress,
      timeout: timeout || 2000,
      invalidMailboxKeywords: invalidMailboxKeywords || [],
      mailFrom: mailFrom || 'email@example.org',
      // helpers
      mailbox: emailAddress.split('@')[0],
      hostname: emailAddress.split('@')[1],
      mxRecords: [],
      smtpMessages: [],
      // results
      isValidPattern: false,
      isValidMx: false,
      isValidMailbox: false,
      result: ''
    }
  }

  /**
   * Determines if the email address pattern is valid based on regex and invalid keyword check.
   * 
   * @static
   * @param {string} emailAddress - The full email address ypu want to check.
   * @param {string[]} [invalidMailboxKeywords=[]] - An array of keywords to invalidate your check, ie. noreply, noemail, etc.
   * @returns {boolean} 
   * @memberof MailConfirm
   */
  static resolvePattern(emailAddress, invalidMailboxKeywords = []) {
    const mailbox = emailAddress.split('@')[0]
    const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    const isValidPattern =
      regex.test(emailAddress) || invalidMailboxKeywords.indexOf(mailbox) === -1
    return isValidPattern
  }

  // private instance method
  _resolvePattern(emailAddress, invalidMailboxKeywords = []) {
    return MailConfirm.resolvePattern(emailAddress, invalidMailboxKeywords)
  }

  /**
   * Wrap of dns.resolveMx native method.
   * 
   * @static
   * @param {string} hostname - The hostname you want to resolve, i.e. gmail.com
   * @returns {Object[]} - Returns MX records array { priority, exchange }
   * @memberof MailConfirm
   */
  static async resolveMx(hostname) {
    // mx check
    try {
      let mxRecords = await resolveMx(hostname)
      return mxRecords.sort((a, b) => a.priority - b.priority)
    } catch (err) {
      return []
    }
  }

  // private instance method
  _resolveMx(hostname) {
    return MailConfirm.resolveMx(hostname)
  }

  /**
   * Runs the SMTP mailbox check. Commands for HELO/EHLO, MAIL FROM, RCPT TO.
   * 
   * @static
   * @param {Object} config - Object of parameters for Smtp Mailbox resolution.
   * @param {string} config.emailAddress - The email address you want to check.
   * @param {object[]} config.mxRecords - The MX Records array supplied from resolveMx.
   * @param {number} config.timeout - Timeout parameter for the SMTP routine.
   * @param {string} config.mailFrom - The email address supplied to the MAIL FROM command.
   * @returns {object[]} - Object of SMTP responses {command, status, message}
   * @memberof MailConfirm
   */
  static resolveSmtpMailbox({ emailAddress, mxRecords, timeout, mailFrom }) {
    return new Promise((resolve, reject) => {
      const host = mxRecords[0].exchange
      const commands = [
        `HELO ${host}`,
        `MAIL FROM: <${mailFrom}>`,
        `RCPT TO: <${emailAddress}>`
      ]

      const stepMax = commands.length - 1
      let step = 0
      const smtp = net.createConnection({ port: 25, host })
      let smtpMessages = []

      smtp.setEncoding('ascii')
      smtp.setTimeout(timeout)

      smtp.on('next', () => {
        if (step < stepMax) {
          smtp.write(commands[step] + '\r\n')
          step++
        } else {
          smtp.end(() => {
            resolve(smtpMessages)
          })
        }
      })

      smtp.on('error', err => {
        smtp.end(() => {
          reject(err)
        })
      })

      smtp.on('data', data => {
        const status = parseInt(data.substring(0, 3))
        smtpMessages.push({
          command: commands[step],
          message: data,
          status
        })
        if (status > 200) {
          smtp.emit('next')
        }
      })
    })
  }
  // private instance method
  _resolveSmtpMailbox({ emailAddress, mxRecords, timeout, mailFrom }) {
    return MailConfirm.resolveSmtpMailbox({
      emailAddress,
      mxRecords,
      timeout,
      mailFrom
    })
  }

  /**
   * Runs the email validation routine and supplies a final result.
   * 
   * @returns {Object} - The instance state object containing all of the isValid* boolean checks, MX Records, and SMTP MEssages.
   * @memberof MailConfirm
   */
  async check() {
    // pattern check
    const isValidPattern = this._resolvePattern(
      this.state.emailAddress,
      this.state.invalidMailboxKeywords
    )
    this.state.isValidPattern = isValidPattern

    if (!isValidPattern) {
      this.state.result = 'Email pattern is invalid.'
      return this.state
    }

    // mx check
    try {
      const mxRecords = await this._resolveMx(this.state.hostname)
      const isValidMx = mxRecords.length > 0
      this.state.mxRecords = mxRecords
      this.state.isValidMx = isValidMx

      if (!isValidMx) {
        this.state.result = 'Email server is invalid or not available.'
        return this.state
      }
    } catch (err) {
      throw new Error('MX record check failed.')
    }

    // mailbox check
    try {
      const { emailAddress, mxRecords, timeout, mailFrom } = this.state
      const smtpMessages = await this._resolveSmtpMailbox({
        emailAddress,
        mxRecords,
        timeout,
        mailFrom
      })
      this.state.smtpMessages = smtpMessages
      const isComplete = smtpMessages.length === 3
      let result = ''

      if (isComplete) {
        const { status } = smtpMessages[2]
        // OK RESPONSE
        if (status === 250) {
          result = 'Mailbox is valid.'
          this.state.result = result
          this.state.isValidMailbox = true
        } else {
          result = 'Mailbox is invalid.'
          this.state.result = result
          this.state.isValidMailbox = false
        }
      } else {
        result = 'Could not validate mailbox.'
        this.state.result = result
        this.state.isValidMailbox = false
      }
      return this.state
    } catch (err) {
      throw new Error('Mailbox check failed.')
    }
  }
}

module.exports = MailConfirm
