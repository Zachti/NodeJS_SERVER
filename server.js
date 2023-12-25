const express = require ('express')
const app = express()
const userRoute = require('./routes/todo')

app.use(express.json())
app.use(userRoute)

app.listen('9583' , ()=>{
    console.log('Server running on port 9583...')
})
