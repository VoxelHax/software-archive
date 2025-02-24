const fs = require('fs')
const path = require('path')

const repo = process.env.REPO

function parseFileTree(filePath) {
    const data = fs.statSync(path.resolve(filePath))
    return data.isFile() ? {
        name: path.basename(filePath),
        type: `file`,
        url: `https://raw.githubusercontent.com/${repo}/main/${filePath}`
    } : {
        name: path.basename(filePath),
        type: `dir`,
        files: fs.readdirSync(path.resolve(filePath)).map(p => parseFileTree(`${filePath}/${p}`))
    }
}

const manifest = {
    software: fs.readdirSync(path.resolve(`software`))
        .sort()
        .map(name => ([name, JSON.parse(fs.readFileSync(path.resolve(`software/${name}/software.json`)))]))
        .map(([id, data]) => {
            return {
                id,
                data,
                releases: fs.readdirSync(path.resolve(`software/${id}/releases`))
                    .sort(semverCompare)
                    .map(name => ([name, JSON.parse(fs.readFileSync(path.resolve(`software/${id}/releases/${name}/version.json`)))]))
                    .map(([version, release]) => {
                        const files = []
                        if (fs.existsSync(path.resolve(`software/${id}/releases/${version}/files`))) {
                            for (const file of fs.readdirSync(path.resolve(`software/${id}/releases/${version}/files`)))
                                files.push(parseFileTree(`software/${id}/releases/${version}/files/${file}`))
                        }
                        return {
                            version,
                            release,
                            ...(files.length > 0 ? { files } : {})
                        }
                    })
            }
        })
}

fs.writeFileSync('api.json', JSON.stringify(manifest), { encoding: 'utf8' })

function semverCompare(a, b) {
    const pa = a.split('.').map(Number)
    const pb = b.split('.').map(Number)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0
        const nb = pb[i] || 0
        if (na !== nb) return na - nb
    }
    return 0
}
