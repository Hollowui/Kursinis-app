import { store } from '../data/store.js'

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i

export function requireClientContext(
    request,
    response,
    next,
) {
    const clientId = request.header('x-client-id')

    if (!clientId) {
        return response.status(400).json({
            error: 'Trūksta x-client-id antraštės',
        })
    }

    if (!OBJECT_ID_PATTERN.test(clientId)) {
        return response.status(400).json({
            error: 'Netinkamas kliento identifikatorius',
        })
    }

    const clientExists = store.clients.some(
        (client) => client.id === clientId,
    )

    if (!clientExists) {
        return response.status(404).json({
            error: 'Klientas nerastas',
        })
    }

    request.clientId = clientId

    next()
}
