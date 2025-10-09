const metadata = require('@metaplex-foundation/mpl-token-metadata');
console.log("Exported functions:");
console.log(Object.keys(metadata).filter(k => k.includes('create')).join('\n'));
