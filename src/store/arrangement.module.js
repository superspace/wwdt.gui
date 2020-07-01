import Axios from "axios"
import store from "."

const state = {
    arrangement: {},
    tmpArrangement: {},
    arrangements: [],
    active: true,
    locked: false
}

const actions = {

    reset ({ commit }) {
        commit('reset')
    },

    lock ({ commit }) {
        commit('setLocked', true)
    },

    unlock ({ commit }) {
        commit('setLocked', false)
    },

    setActive ({ commit }, active) {
        commit('setActive', active)
    },

    setArrangements ( {commit}, arrangements) {
        commit('setArrangements', arrangements)
    },

    setArrangement ( {commit}, arrangement) {
        commit('setArrangement', arrangement)
    },

    setTmpArrangement ( {commit}, arrangement) {
        commit('setTmpArrangement', arrangement)
    },

    createArrangement({ commit }, arrangement) {

        let data = new FormData
        data.append('title', arrangement.title)
        data.append('sessionId', store.state.project.session.id)

        return new Promise((resolve) => {
            Axios.post('/arrangement/create', data)
                .then(resp => {
                    if (resp.data.status === 'OK') {
                        arrangement = resp.data.result
                        commit('createArrangement', arrangement)
                        resolve()
                    }
                })
        })
    },

    getArrangement ({ commit, dispatch }, id) {

        return new Promise((resolve) => {
            Axios.get('/arrangement/'+id)
                .then(resp=> {
                    let arrangement = resp.data
                    let keyframes = arrangement.keyframes
                    delete arrangement.keyframes
                    commit('setArrangement', arrangement)
                    dispatch('keyframe/setKeyframes', keyframes, {root: true})
                    if (!state.locked) {
                        dispatch('keyframe/resetKeyframe', null, {root: true}) 
                    }
                    resolve()
                })
            })
        },
}

const mutations = {

    reset (state) {
        state.arrangement = {}
        state.arrangements = []
    },

    setLocked (state, locked) {
        state.locked = locked
    },

    setActive (state, active) {
        state.active = active
    },

    createArrangement(state, arrangement) {
        state.arrangements.push(arrangement)
        state.arrangement = arrangement
    },

    setArrangements (state, arrangements) {
        state.arrangements = arrangements
    },

    setTmpArrangement (state, arrangement={}) {
        state.arrangement = Object.assign({}, arrangement)
    },

    setArrangement (state, arrangement={}) {
        state.arrangement = arrangement
    },

}

export const arrangement = {
    namespaced: true,
    state,
    actions,
    mutations
}
