<template>
        <vue-draggable-resizable
            :w="w"
            :h="h"
            :x="xpos"
            :y="ypos"
            :z="props.z"
            :lock-aspect-ratio="lockRatio"
            :min-width="50"
            :min-height="50"
            :grid="[10,10]"
            :handles="['tl','tr','bl','br']"
            :resizable="isResizable"
            :draggable="isDraggable"
            :active="active"
            :class="assetClass"
            :key="componentKey"
            :onDragStart="onDragStartCallback"
            @dragstop="handleDragStop"
            @resizing="handleResize"
            @resizestop="handleResizeStop"
            @activated="handleActivation"
            @deactivated="handleDeactivation"
            v-show="xpos"
            >

            <div v-show="active">
                <div class="c-asset__toolbar d-flex flex-row align-end">
                    <span>
                    <b-button-group>
                        <b-button size="sm" variant="primary" 
                            @click.prevent.stop="openUpdateAssetModal">
                            <b-icon-pencil></b-icon-pencil>
                        </b-button>
                        <b-button variant="light" size="sm" @click.prevent="openViewAssetModal">
                            <b-icon-eye></b-icon-eye>
                        </b-button>
                        <b-button size="sm" variant="light">
                            <b-icon-arrow-up-short @click.prevent.stop="handleIncreaseZ"></b-icon-arrow-up-short>
                        </b-button>
                        <b-button size="sm" variant="light" @click.prevent.stop="handleDecreaseZ">
                            <b-icon-arrow-down-short></b-icon-arrow-down-short>
                        </b-button>
                        <b-button size="sm" variant="light" @click.prevent.stop="handleRemoveAssetFromKeyframe">
                            <b-icon-x ></b-icon-x>
                        </b-button>
                    </b-button-group>
                    </span> 
                </div>
            </div>

            <h2 :class="['mb-0', textClass]" v-if="asset.type == 'LABEL'">{{ asset.title }}</h2>

            <div v-if="asset.type == 'TEXT'" class="p-2" 
                v-html="$options.filters.truncate(asset.content, 180)"></div>

            <div v-if="asset.type == 'AUDIO'" class="p-2">
                <b-icon-volume-up-fill size="lg"></b-icon-volume-up-fill> {{ asset.title }}
            </div>

            <div v-if="asset.type == 'VIDEO'" class="p-2">
                <b-icon-camera-video-fill size="lg"></b-icon-camera-video-fill> {{ asset.title }}
            </div>

            <div v-if="asset.type == 'FILE'" class="p-2">
                <b-icon-file-earmark size="lg"></b-icon-file-earmark> {{ asset.title }}
            </div>

            <figure v-show="src">
                <img @load="handleLoad" :src="src" 
                :alt="asset.title" v-b-tooltip.hover.bottom
                :title="asset.title"
                class="img-fluid" ref="image" /> 
                <!-- <div style="position: absolute; top: 0; background: white"><pre>{{ratio}} {{props.scale}}</pre></div> -->
            </figure>

        </vue-draggable-resizable>

</template>

<script>

import VueDraggableResizable from 'vue-draggable-resizable'

import 'vue-draggable-resizable/dist/VueDraggableResizable.css'

import { mapState, mapActions, mapGetters } from 'vuex'

export default {
    name: 'DraggableAsset',
    components: {
        VueDraggableResizable
    },
    props: {
        asset: Object,
        props: Object,
        parent: Object
    },
    data: function () {
        return {
            w: null,
            h: null,
            xpos: 0,
            ypos: 0,
            ratio: 1,
            dragging: false,
            resize: false,
            visible: true,
            active: false,
            initalWidth: 200,
            componentKey: 0,
            style: {},
            loaded: false
        }
    },
    mounted: function () {
        this.updatePosition()
    },

    watch: {
        props: {
            deep: true,
            handler: function () {
                this.updatePosition()
            }
        },
        parent: {
            deep: true,
            handler: function () {
                this.updatePosition()
            }
        },
        dragging: function (val) {
            if (this.hasEditPermission) {
                if (val) {
                    this.lock()
                } else {
                    this.unlock()
                }
            }
        },
        resize: function (val) {
            if (val) {
                this.lock()
            } else {
                this.unlock()
            }
        }
    },
    computed: {
        ...mapState('timeline', ['time']),
        ...mapState('player', ['play']),

        ...mapGetters('user', ['hasEditPermission']),

        src: function () {
            return (this.asset.file.thumb) ? process.env.VUE_APP_ADMIN_HOST + this.asset.file.thumb : ''
        },

        assetClass: function () {
            let classNames = 'c-asset'

            if (!this.resize && !this.dragging) 
                classNames += ' c-asset--animate'            

            // if (!this.isResizable)
            //     classNames += ' c-asset--autosize'

            if (this.asset.type == 'IMAGE' && !this.loaded)
                classNames += ' c-asset--hidden'

            if (this.hasEditPermission)
                classNames += ' c-asset--editable'

            return classNames
        },

        textClass: function () {
            let className = ''
            switch (this.asset.rank) {
                case 1:
                    className = 'text-info'
                    break;
                case 2:
                    className = 'text-success'
                    break;
                case 3:
                    className = 'text-warning'
                    break;
                case 4:
                    className = 'text-danger'
                    break;
                default:
                    className = 'text-primary'
            }
            return className
        },

        lockRatio: function () {

            let lock = false;

            if (this.asset.type == 'IMAGE') {
                lock = true;   
            }

            return lock

        },

        isResizable: function () {
            return (this.asset.type == 'IMAGE') && this.hasEditPermission ? true : false
        },

        isDraggable: function () {
            return this.hasEditPermission ? true : false
        },

        parentWidth: function () {
            return this.parent.width / 2
        },
        parentHeight: function () {
            return this.parent.height / 2
        }

    },
    methods: {

        ...mapActions('keyframe', ['updateProperties','removeAssetFromKeyframe']),
        ...mapActions('assets', ['setTmpAsset', 'setAsset']),
        ...mapActions('arrangement', ['lock', 'unlock']),

        updatePosition: function () {

            const x = Math.round((this.parentWidth / 100 * this.props.x + this.parentWidth)*1000)/1000
            const y = Math.round((this.parentHeight / 100 * this.props.y + this.parentHeight)*1000)/1000

            this.xpos = x
            this.ypos = y

            this.setSize()

            const context = this;
            setTimeout(function () {
                context.forceUpdate()
            }, 500)

        },

        handleLoad: function (e) {
            let image = e.currentTarget
            let height = image.naturalWidth
            let width = image.naturalHeight

            if (height && width) {
                this.ratio = Math.round((width/height)*1000)/1000;
            }

            if (!this.loaded) {

                this.loaded = true
                this.updatePosition()
                this.forceUpdate()
            }

        },

        forceUpdate: function () {
            this.componentKey += 1
            this.dragging = false
            this.resize = false
        },

        handleIncreaseZ: function () {
            this.props.z += 1

            const payload = {
                asset: this.asset,
                props: {
                    z: this.props.z
                }
            }

            this.updateProperties(payload)
        },

        handleDecreaseZ: function () {
            this.props.z -= 1

            const payload = {
                asset: this.asset,
                props: {
                    z: this.props.z
                }
            }

            this.updateProperties(payload)
        },

        setSize: function () {
            this.w = Math.round(this.initalWidth * this.props.scale * 1000)/1000
            if (this.lockRatio) {
                this.h = Math.round(this.w * this.ratio) 
            }
        },

        onDragStartCallback: function () {
            if (this.hasEditPermission) {
                this.dragging = true
            }
        },

        handleDragStop: function (x, y) {

            if (x != this.xpos || y != this.ypos) {    

                this.active = false

                let xpos = x - this.parentWidth;
                let ypos = y - this.parentHeight;

                if (xpos > this.parentWidth || xpos < this.parentWidth * -1) {
                    xpos = this.props.x;
                }
                if (ypos > this.parentHeight || ypos < this.parentHeight * -1) {
                    ypos = this.props.y;
                }

                const relativeX = Math.round(100 / this.parentWidth * xpos * 1000) / 1000
                const relativeY = Math.round(100 / this.parentHeight * ypos * 1000) / 1000

                this.props.x = relativeX;
                this.props.y = relativeY;

                const payload = {
                    asset: this.asset,
                    props: this.props
                }

                this.updateProperties(payload)
                    .then(()=> {
                        this.updatePosition()
                    })

            }

        },

        handleResize: function () {
            this.resize = true
        },

        handleResizeStop: function (x, y, width) {
            const scale = Math.round((width / this.initalWidth)*100)/100;

            this.props.scale = scale

            const payload = {
                asset: this.asset,
                props: {
                    scale: scale
                }
            }

            this.updateProperties(payload)
                .then(()=> {
                    this.updatePosition()
                })

        },

        handleActivation: function () {
            if (this.hasEditPermission)
                this.active = true
        },

        handleDeactivation: function () {
            this.active = false
        },

        handleRemoveAssetFromKeyframe: function () {
            this.removeAssetFromKeyframe(this.asset)
        },

        openViewAssetModal: function () {
            this.setAsset(this.asset)
            this.$bvModal.show('modal-view-asset')  
        },

        openUpdateAssetModal: function () {
            this.setTmpAsset(this.asset)
            this.$bvModal.show('modal-update-asset')  
        },

    },
}
</script>

<style lang="scss" scoped>


.c-asset {
    background: transparentize(black, 0.95);
    box-shadow: 2px 2px 5px transparentize(black, 0.8);
    opacity: 1;
    border: 1px solid #CCC;
    position: absolute;

    &--animate {
        transition: all 0.4s ease-in-out;
        transition-property: width, height, transform;
    }

    &--hidden {
        opacity: 0;
    }

    &--editable {
        border: 1px dashed black;
    }

    // &--autosize {
    //     width: auto !important;
    //     height: auto !important;
    //     padding: 10px 15px;
    //     box-shadow: none;
    //     background: none;
    //     border: none;
    // }

    &__toolbar {
        position: absolute;
        top: -32px;
        height: 32px;
    }

    .img-fluid {
        max-width: none;
        width: 100%;
    }
}

</style>