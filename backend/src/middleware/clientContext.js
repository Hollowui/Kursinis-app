import { clientExists } from '../data/repository.js'

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i

export async function requireClientContext(
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

    const exists = await clientExists(clientId)

    if (!exists) {
        return response.status(404).json({
            error: 'Klientas nerastas',
        })
    }

    request.clientId = clientId

    next()
}
