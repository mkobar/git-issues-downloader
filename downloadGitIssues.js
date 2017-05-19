#!/usr/bin/env node

const fs = require('fs')
const request = require('request')
const _ = require('lodash')
const moment = require('moment')
const argv = require('yargs')
  .usage('Usage: $0 --username [username] --password [password] --repository [full URL of repository]')
  .demandOption(['username', 'password', 'repository'])
  .default('fileName', 'all_issues.csv')
  .help('h')
  .alias('h', 'help')
  .describe('fileName', 'Name of output file')
  .version('1.0.0')
  .alias('version', 'ver')
  .argv
const chalk = require('chalk')

const outputFileName = argv.fileName

const issuesPerPage = 10
const username = argv.username
const password = argv.password
const repoUserName = argv.repository.slice(19, argv.repository.indexOf('/', 19))
const repoUrl = argv.repository.slice(20 + repoUserName.length)

const startUrl = `https://api.github.com/repos/${repoUserName}/${repoUrl}/issues?per_page=${issuesPerPage}&state=all&page=1`

const requestOptions = {
  headers: {
    'User-Agent': 'request'
  },
  auth: {
    'user': username,
    'pass': password
  }
}

//Main function for running program

function main (data, url) {

  requestBody(url, (error, response, body) => {

    const rawLink = response.headers.link

    //take body, parse it and add it to data

    body = JSON.parse(body)
    data = _.concat(data, body)

    if (rawLink && rawLink.includes('next')) {

      const link = rawLink.slice(rawLink.indexOf('<') + 1, rawLink.indexOf('>'))
      const currentPage = link.slice(link.lastIndexOf('=') + 1) - 1
      const lastPage = rawLink.slice(rawLink.indexOf('page', 158) + 5, rawLink.indexOf('last') - 8)

      console.log(chalk.green(`Successfully requested ${currentPage}. page of ${lastPage}`))

      main(data, link)
    }
    else {
      console.log(chalk.green(`Successfully requested last page`))
      
      writeData(convertJSonToCsv(error, data), outputFileName)
    }

  })
}

//Function using URL to request API

function requestBody (url, callback) {
  console.log('Requesting API...')
  request(url, requestOptions, function (err, response, body) {
    if (err) throw err
    callback(err, response, body)
  })
}

//Function which take JSON data, convert them into CSV format and return them

function convertJSonToCsv (err, jsData) {
  if (err) throw err

  console.log('\nConverting issues...')

  const csvData = jsData.map(object => {
    const date = moment(object.created_at).format('L')
    const labels = object.labels
    const stringLabels = labels.map(label => label.name).toString()

    return `"${object.number}"; "${object.title.replace(/"/g, '\'')}"; "${object.html_url}"; "${stringLabels}"; "${object.state}"; "${date}"\n`
  }).join('')

  console.log(chalk.green(`Successfully converted ${jsData.length} issues!`))

  return csvData
}

// Function create a new file and write converted data on him

function writeData (data, outputFileName) {
  fs.writeFile(outputFileName, data, (err) => {
    if (err) throw err
    console.log('Writing data to csv file')
    console.log(chalk.yellow(`\nProcess was successful\nIssues was downloaded, converted and saved to ${outputFileName}`))
  })
}

//run main function

main([], startUrl)
