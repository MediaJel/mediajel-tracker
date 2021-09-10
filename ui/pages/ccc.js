import React from 'react'

function ccc() {
    function clicking() {
        fetch('http://localhost:3000/')
        console.log('hello')
    }
    return(
        <div>
            <button onClick={() => {clicking()}}>A button</button>
        </div>
    )
}

export default ccc