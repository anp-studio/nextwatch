<script setup>
import { ref } from 'vue'

const { updatePassword } = useAuth()
const router = useRouter()

const newPassword = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const _handlePasswordUpdate = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match'
    return
  }

  if (newPassword.value.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters'
    return
  }

  isLoading.value = true

  try {
    const { error } = await updatePassword(newPassword.value)

    if (error) throw error

    successMessage.value = 'Password updated successfully!'
    setTimeout(() => {
      router.push('/profile')
    }, 2000)
  } catch (error) {
    errorMessage.value = error.message || 'Failed to update password. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>
