  module.exports = (data) => ({
        id: data.id,
        govtrack_id: data.govtrack_id || null,
        displayName: data.displayName,
        in_office: !!data.in_office,
    })