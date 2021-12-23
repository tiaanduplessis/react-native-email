import { Linking } from 'react-native'
import qs from 'qs'

async function sendEmail (to, { cc, bcc, subject, body } = {}) {
  let url = 'mailto:'

  if (to) {
    const toStr = Array.isArray(to) ? to.join(',') : to
    url += encodeURIComponent(toStr)

    if (cc) {
      cc = Array.isArray(cc) ? cc.join(',') : cc
    }

    if (bcc) {
      bcc = Array.isArray(bcc) ? bcc.join(',') : bcc
    }

    const query = qs.stringify({ cc, bcc, subject, body })

    if (query.length) {
      url += `?${query}`
    }
  }

  return Linking.openURL(url).catch(() => handleError());
}

function handleError() {
  return Promise.reject(new Error('Provided URL can not be handled'));
}

export default sendEmail
