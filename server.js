// @ts-ignore
const config = require('./config.json')
const express = require('express')
const app = express()
const session = require('express-session')
const _ = require('lodash')
const fs = require('fs')
const shuffle = require('shuffle-array')

const writeData = () => {
    setTimeout(function(){
        fs.writeFile("database.json", JSON.stringify({
            registered_users: registered_users,
            started: started,
            generated: generated
        }, null, 2), function(err) {
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

if(!fs.existsSync('./database.json')){
    fs.writeFileSync('./database.json', '{}')
}

// @ts-ignore
const database = require('./database.json')
const registered_users = typeof database.registered_users === 'undefined' ? [] : database.registered_users
let started = typeof database.started === 'undefined' ? false : database.started
let generated = typeof database.generated === 'undefined' ? false : database.generated

app.get(`/${config.secretStartUrl}`, function (req, res) {
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

app.get(`/${config.secretStatusUrl}`, function(req,res) {
    res.write(`<html><h1>${config.title} Debug</h1>`)

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

app.get(`/${config.secretGenerateUrl}`, function (req, res) {
    res.write(`<html><h1>${config.title} Debug</h1>`)

    console.log('generating')
    if(registered_users.length < 3){
        res.write('Not enough users')
    } else {
        if(!started){
            generated = true

            let successful = false
            let tries = 0
            let shuffledUsers
            while(!successful && tries < 10000){
                tries++
                shuffledUsers = shuffle(_.map(registered_users, 'name'))
                for (let i = 0; i < shuffledUsers.length; i++) {
                    const user_index = _.findIndex(registered_users, {'name': shuffledUsers[i] })
                    registered_users[user_index]['recipient'] = shuffledUsers[i + 1 > shuffledUsers.length - 1 ? 0 : i + 1 ]
                }
    
                if(!registered_users.find(o => _.get(o,'blocked', []).includes(o.recipient))) {
                    console.log('solution found on try', tries)
                    successful = true
                }
            }
            
            console.log('done generating')
            if(successful){
                res.write('No conflict solution found!<br />')
            } else {
                res.write('Unable to brute force a solution<br />')
            }
            console.log(registered_users)
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

    const parsedName = typeof  req.query.name === 'undefined' ? '' : req.query.name.toString().toLowerCase().trim()
    res.write(`<html><style>
table, th {
    border: 1px dotted black;
    border-collapse: collapse;
}
</style><h1>${config.title}</h1>`)
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


    if(req.query.gimmie && req.session.registered) {
        const user = registered_users.find(o => o.name === req.session.name)
        user.wants = req.query.gimmie
    }

    if(req.query.block && req.session.registered) {
        const user = registered_users.find(o => o.name === req.session.name)
        const blockedUser = registered_users.find(o => o.name === req.query.block)
        if(!blockedUser) {
            res.write(`Could not find user ${req.query.block}<br /><br />`)
        } else {
            console.log(`${user.name} blocked ${req.query.block}`)
            if(!user.blocked) user.blocked = []
            user.blocked.push(req.query.block)
        }
    }

    if(req.query.unblock && req.session.registered) {
        console.log('unblocking..')
        const user = registered_users.find(o => o.name === req.session.name)
        const blockedUser = registered_users.find(o => o.name === req.query.unblock)
        if(!blockedUser) {
            res.write(`Could not find user ${req.query.unblock}<br /><br />`)
        } else {
            console.log(`${user.name} unblocked ${req.query.unblock}`)
            if(user.blocked) {
                _.remove(user.blocked,  o => o === req.query.unblock)
            }
        }
    }

    if (req.session.registered) {
        res.write('You are: ' + req.session.name)
        res.write('<br />Your Recipient: ' +  (started ? _.find(registered_users, {'name': req.session.name })['recipient'] : 'not started yet'))
    } else {
        res.write(`Who are you ?:<br><form><input type="text" name="name"><br><input type="submit" value="Submit"></form>`)
    }

    
    const self = req.session.registered ? registered_users.find(o => o.name === req.session.name) : null
    if(self){
        res.write(`<br/><br/>I want a?:<br><form><input type="text" name="gimmie"><br><input type="submit" value="Gimmie"></form>`)
        res.write('<br/><br/><b>Block people you don\'t want to get:</b><br /><br />')
        res.write(`<table style="width:100%;border: 1px solid black;"><tr><td><b>Participant</b></td><td><b>Wants</b></td><td><b>Block</b></td></tr>`)
        
        

        for(const user of registered_users){
            res.write(`<tr style="border: 1px solid black;">`)
            res.write(`<td>${user.name}</td>`)
            res.write(`<td>${user.wants || '?'}</td>`)
            res.write(`<td>`)
            if(user && user.name !== req.session.name && req.session.name){
                const blockedUsers = _.get(self, 'blocked', [])
                if(blockedUsers.includes(user.name)){
                    res.write(` <a href="?unblock=${user.name}">unblock</a>`)
                } else {
                    res.write(` <a href="?block=${user.name}">block</a>`)
                }
            }
            res.write('</td></tr>')
        }    
    } else {
        res.write('<br/><br/><b>Participants:</b><br />')
        for(const user of registered_users){
            res.write(user.name)
            res.write('<br />')
        }    
    }
    

    res.write('</html>')
    res.end()
})

console.log('listening on port 3000')
app.listen(3000)
writeData()