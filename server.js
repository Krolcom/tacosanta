const express = require('express')
const app = express()
const session = require('express-session')
const _ = require('lodash')
const fs = require('fs')

const writeData = () => {
    setTimeout(function(){
        fs.writeFile("database.json", JSON.stringify({
            registered_users: registered_users,
            started: started,
            generated: generated
        }), function(err) {
            console.log('database saved!')
            if (err) {
                console.log(err)
            }
            writeData()
        })
    }, 30000)
}

app.use(session({
    secret: 'this is a secret',
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false }
}))

const database = require('./database.json')
const registered_users = typeof database.registered_users === 'undefined' ? [] : database.registered_users
let started = typeof database.started === 'undefined' ? false : database.started
let generated = typeof database.generated === 'undefined' ? false : database.generated

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a
}

app.get('/startTacoSanta', function (req, res) {
    if(registered_users < 3){
        res.write('Not enough users')
    } else if (!generated) {
        res.write('not generated yet')
    } else {
        console.log('started!')
        started = true
        res.write('started')
    }
    res.end()
})

app.get('/statusTacoSanta', function(req,res) {
    res.write('<html><h1>Taco Santa Debug</h1>')

    if(registered_users < 3){
        res.write('Not enough users')
    }

    for(const user of registered_users){
        res.write(user.name + ' => ' + user.recipient + '<br />')
    }

    if(!started){
        res.write('<br /><br /><a href="generateTacoSanta">Regenerate</a>')
        res.write('<br /><a href="startTacoSanta">Start</a>')
    } else {
        res.write('<br /><br />already started!')
    }

    res.write('</html>')
    res.end()
})

app.get('/generateTacoSanta', function (req, res) {
    res.write('<html><h1>Taco Santa Debug</h1>')

    if(registered_users < 3){
        res.write('Not enough users')
    } else {
        if(!started){
            generated = true
            const shuffledUsers = shuffle(_.map(registered_users, 'name'))

            for (let i = 0; i < shuffledUsers.length; i++) {
                const user_index = _.findIndex(registered_users, {'name': shuffledUsers[i] })
                registered_users[user_index]['recipient'] = shuffledUsers[i + 1 > shuffledUsers.length - 1 ? 0 : i + 1 ]
                console.log(registered_users)
            }
        }
    }

    for(const user of registered_users){
        res.write(user.name + ' => ' + user.recipient + '<br />')
    }

    if(!started){
        res.write('<br /><br /><a href="generateTacoSanta">Regenerate</a>')
        res.write('<br /><a href="startTacoSanta">Start</a>')
    } else {
        res.write('<br /><br />already started!')
    }

    res.write('</html>')
    res.end()
})


app.get('/', function (req, res) {
    res.setHeader('Content-Type', 'text/html')

    const parsedName = typeof  req.query.name === 'undefined' ? '' : req.query.name.toLowerCase().trim()
    res.write('<html><h1>Taco Santa</h1>')
    if(req.query.name && !req.session.registered) {
        if (req.query.name.length === 0) {
            res.write('you must enter a name')
            res.write('<br />')
        } else if (!parsedName.match(/^[ a-z]+$/)) {
            res.write('alpha characters and spaces only')
            res.write('<br />')
        } else {

            const user = _.find(registered_users, {'name': parsedName})
            if (typeof user === 'undefined') {
                if (started) {
                    res.write('could not find user')
                    res.write('<br />')
                } else {
                    req.session.registered = true
                    req.session.name = parsedName
                    registered_users.push({
                        name: parsedName
                    })
                }
            } else {
                req.session.registered = true
                req.session.name = _.find(registered_users, {'name': parsedName})['name']
            }
        }
    }

    if (req.session.registered) {
        res.write('You are: ' + req.session.name)
        res.write('<br />Your Recipient: ' +  (started ? _.find(registered_users, {'name': req.session.name })['recipient'] : 'not started yet'))
    } else {
        res.write(`Who are you ?:<br><form><input type="text" name="name"><br><input type="submit" value="Submit"></form>`)
    }

    res.write('<br/><br/><b>Participants:</b><br />')
    for(const user of registered_users){
        res.write(user.name + '<br />')
    }

    res.write('</html>')
    res.end()
})

app.listen(3000)
writeData()