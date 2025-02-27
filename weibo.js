require('dotenv').config()
const { Octokit } = require('@octokit/rest')
const axios = require('axios')
const cheerio = require('cheerio')
const signale = require('signale')

const {
  WEIBO_GIST_ID: gistId,
  GH_TOKEN: githubToken
} = process.env

const octokit = new Octokit({ auth: `token ${githubToken}` })

const fetch = () => axios.get('https://s.weibo.com/top/summary').then(res => {
  if (res.status === 200) {
    const { data } = res
    const $ = cheerio.load(data)
    const list = []
    const desc = ''
    $('ul.list_a').find('li').map(function () {
      const target = $(this)
      const rank = target.find('.hot').text()
      let title = target.find('span').text()
      if (rank == null || Number(rank) <= 0) {
        list.push('rank,title,number')
      } else {
        const res = /[0-9]+[\s]*$/.exec(title)
        let number = 'UNKNOWN'
        if (res != null) { number = res[0].trim() }
        title = title.trim().replace(number, '').replace(/,/g, '.').replace(/"/g, '\'')
        list.push(`${rank},${title},${number}`)
      }
    })

    if (list.length === 0) {
      throw new Error('Cannot fetch rank data')
    }

    return { list, desc }
  } else {
    throw new Error('Cannot fetch rank data')
  }
}).catch(error => {
  throw error
});

(async () => {
  const { list, desc } = await fetch()
  const gist = await octokit.gists.get({ gist_id: gistId })
  const fileName = Object.keys(gist.data.files)[0]
  signale.pending(`${fileName} ${list[1]}`)
  await octokit.gists.update({
    gist_id: gistId,
    description: desc,
    files: {
      [fileName]: {
        fileName: '微博热搜榜',
        content: list.join('\n')
      }
    }
  }).catch(error => {
    console.error('Cannot update gist.')
    throw error
  })
})()
