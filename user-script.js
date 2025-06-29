console.log('working')
    $(document).ready(async function ($) {
      
        // db
        let appAPI = "https://script.google.com/macros/s/AKfycbyeGTNi0wRhjw0Qdpo-MZp6PgZby7bBlOiuxwprcivS0kW9-WRQVY_NtYOQCcCkMpX2/exec"
        // let gsId = "1iwiJVuFW2exmR12H0a9uP4-Y4vlBNAbpDlfD3_CNVKk"
        let readAll = `${appAPI}?action=readall`


        const db_orderFormHeader = ['TASK NAME', 'ADDITIONAL INSTRUCTION', 'STATUS', 'QUEUE', 'DATE RECEIVED', 'DATE STARTED', 'DATE COMPLETED']

        const clientName = $('.client-name')
        const loginDialog = $('.login-dialog')
        const loginForm = $('#login-form')
        const taskTitle = $('.task-title')
        const queuePosition = $('.queue-position-count')
        const pendingCount = $('.pending-count')
        const activeCount = $('.active-count')
        const completedCount = $('.completed-count')
        const availableTaskCredit = $('.available-task-credit-count')
        const taskList = $('.task-list tbody')
        const taskOrderDialog = $('.taskOrder-dialog')
        const orderForm = $('#taskOrder-form')
        const taskUpdateDialog = $('.taskUpdate-dialog')
        const updateForm = $('#taskUpdate-form')
        const addOrderBtn = $('.add-order-btn')
        const currentDateDisplay = $('.currentDate')
        let availableTaskCreditCount = 0
        let taskDB
        let maxRequest = 0
        let clientEmail;
        const currentUser = {
            name: '',
            email: '',
        }
        let pending = 0;
        let active = 0;
        let completed = 0;
        let taskCategoryObj = {}
        let taskThisMonthCount = 0
        let signUpDate

        let data


        // taskOrderDialog[0].showModal()
        
        async function getData({showLoader = true}) {
            if(showLoader) Loader('Loading Data...').Open()
            
            try {
                const response = await fetch(readAll)
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }
                const data = await response.json()
                Loader().Close()
                return data
            } catch (error) {
                console.error("Error in getData:", error)
                Loader().Close()
                return null // or [] or throw error again
            }
        }

        
        let currentDate = new Date();
        const today = formatDate(currentDate)
        currentDateDisplay.html(today)

                loginForm.on('submit', async function (e) {
                    e.preventDefault()
                    let userLogin = $(this).find('.login-email-input').val()
                    const $submitBtn = $(this).find('button[type="submit"]')
                    $submitBtn?.addClass('loading')
                    $submitBtn?.text("Signing in...")
                    const isAuthenticated = await AuthenticateUser(userLogin)
                    $submitBtn?.removeClass('loading')
                    $submitBtn?.text("Sign in")

                    if (isAuthenticated) {
                        INIT_dash(data, clientEmail)
                        loginDialog[0].close()

                    } else {
                        alert('Incorrect email or unique code')
                    }
                })

                clientEmail = localStorage.getItem('client')
                if (clientEmail) {
                    const userLogin = localStorage.getItem('awt-username')
                    if(!userLogin) Logout()

                    if (await AuthenticateUser(userLogin, {loader: true})) {
                        INIT_dash(data, clientEmail)
                        loginDialog[0].close()

                    } else {
                        console.log('no data available')
                        return
                    }

                } else {
                    loginDialog[0].showModal()
                } 

                // edit task

                $('.task-manager').on('click', '.task-edit-btn', function () {
                    let taskId = $(this).closest('tr').attr('data-id')
                    let taskIndex = taskDB.findIndex(task => task.ID == taskId)
                    let taskData = taskDB[taskIndex]
                    let materials = taskData['MATERIALS']

                    // $(this).find('[name="include-files"]:checked').val()

                    updateForm.find('[name=update-name]').val(taskData['TASK NAME'])
                    updateForm.find('[name=update-category]').val(taskData['CATEGORY'])
                    updateForm.find('[name=update-additional-instruction]').val(taskData['ADDITIONAL INSTRUCTION'])
                    updateForm.find('[name=queue-position]').val(taskData['QUEUE'])
                    updateForm.find(`#update-file-uploaded-${materials}`).prop('checked', true)

                    updateForm.attr('data-id', taskId)
                    taskUpdateDialog[0].showModal()

                })



                addOrderBtn.on('click', function () {

                    if (taskOrderDialog[0].open) {

                        taskOrderDialog[0].close();
                        taskOrderDialog[0].showModal();

                    } else {
                        taskOrderDialog[0].showModal();
                    }
                })


                orderForm.on('submit', function (e) {
                    e.preventDefault();

                    if (availableTaskCreditCount > 0) {

                        $(this).find('[type=submit]').addClass('loading')
                        const taskName = $(this).find('[name=order-name]').val()
                        const taskCategory = $(this).find('[name=order-category]').val()
                        const additionalInstruction = $(this).find('[name=order-additional-instruction]').val()
                        const queuePos = $(this).find('[name=queue-position]').val()
                        const materials = $(this).find('[name="order-include-files"]:checked').val()

                        let theData = JSON.stringify({
                            'REQUESTOR': currentUser.name,
                            'TASK NAME': taskName,
                            'ADDITIONAL INSTRUCTION': additionalInstruction,
                            'CATEGORY': taskCategory,
                            'QUEUE': queuePos,
                            'MATERIALS': materials

                        })

                        let query = `${appAPI}?action=insert&table=${clientEmail}&data=${theData}`

                        fetch(query, { method: 'GET' })
                            .then((response) => response.json())
                            .then((d) => {
                                $(this).find('[type=submit]').removeClass('loading')
                                console.log(d)

                                if (d.success) {
                                    orderForm[0].reset()

                                    if (window.innerWidth <= 600) {
                                        taskOrderDialog[0].close()
                                    }

                                    INIT_dash(d, clientEmail)

                                }


                            })
                            .catch(e => {
                                console.log(e)
                            })

                    } else {
                        alert('You have exhausted your Task credits')
                    }

                }) // orderForm end


                updateForm.on('submit', function (e) {
                    e.preventDefault();
                    $(this).find('[type=submit]').addClass('loading')
                    const taskID = $(this).attr('data-id')
                    const taskName = $(this).find('[name=update-name]').val()
                    const taskCategory = $(this).find('[name=update-category]').val()
                    const additionalInstruction = $(this).find('[name=update-additional-instruction]').val()
                    const queuePos = $(this).find('[name=queue-position]').val()
                    const materials = $(this).find('[name="include-files"]:checked').val()

                    let theData = JSON.stringify({
                        'TASK NAME': taskName,
                        'ADDITIONAL INSTRUCTION': additionalInstruction,
                        'CATEGORY': taskCategory,
                        'QUEUE': queuePos,
                        'MATERIALS': materials

                    })


                    let query = `${appAPI}?action=update&table=${clientEmail}&data=${theData}&id=${taskID}`

                    fetch(query, { method: 'GET' })
                        .then((response) => response.json())
                        .then((d) => {
                            $(this).find('[type=submit]').removeClass('loading')
                            console.log(d)

                            if (d.success) {
                                INIT_dash(d, clientEmail)


                                updateForm[0].reset()
                                taskUpdateDialog[0].close()
                            }


                        })
                        .catch(e => {
                            console.log(e)
                        })

                }) // updateForm end



        // other functions



        async function AuthenticateUser(userLogin, {loader} = {loader: false}) {
            data = await getData({showLoader: loader})
            let res = false
            let userAccount = data.ACCOUNT_DETAILS.find((item)=> {
                let valid = (userLogin == item.EMAIL || userLogin == item.NAME || userLogin == item.CODE)
                if(!valid) {
                    const members = item.MEMBERS && JSON.parse(item.MEMBERS)
                    if(members){
                        let user = members.find(i => i.userlogin == userLogin)

                        if(user){
                            valid = true
                            currentUser.name = user.name
                            currentUser.email = user.email
                        } else {
                            valid = false
                        }
                    } 

                }

                return valid
            })
            
            if (userAccount) {
                clientEmail = userAccount.EMAIL
                localStorage.setItem('awt-username', userLogin)
                localStorage.setItem('client', clientEmail)
                maxRequest = userAccount['MAX REQUEST']
                clientName.text(currentUser.name)
                $('.upload-file-btn').prop('href', userAccount['FOLDER'])
                signUpDate = userAccount.DATE
                res = true
            }
            
            console.log(currentUser)
            return res
        }

        $('.dialog-close-btn').on('click', function () {
            $(this).closest('dialog')[0].close();
        })



        function INIT_dash(data, emailAdd) {
            let taskList = $('.task-list tbody')
            const queueList = $('[name=queue-position]')
            let pending = 0, completed = 0, active = 0

            // reset necessary elements
            taskList.html("")
            queueList.html('')
            $('.count').text("--")
            $('form')[0].reset()

            let allTask = data[emailAdd]
            
            if (data.success) {
                allTask = data.db
            }

            taskDB = allTask
            const pendingTasks = allTask.filter(i => i.STATUS == "Pending")
            const completedTasks = allTask.filter(i => i.STATUS == "Completed")
            const activeTasks = allTask.filter((i) => i.STATUS == "Active");

            completed = completedTasks.length;
            active = activeTasks.length;

            //SORT PENDING TASK
            const taskNotCompleted = [...pendingTasks,...activeTasks]
            taskNotCompleted.sort((a,b) => {
                return a['QUEUE'] - b['QUEUE']
            })
            const taskWithCalculatedDueDate = processTaskQueue(taskNotCompleted);
           
            console.log(taskWithCalculatedDueDate, 'taskWithCalculatedDueDate')
            taskWithCalculatedDueDate.forEach((item) => {
                // availableTaskCredit.text(maxRequest - data[clientEmail].length)
                    const taskItemTemplate = `<tr data-id="${item.ID}">
                    <td class="task-title">${item['TASK NAME']}</td>
                    <td>${item.CATEGORY}</td>
                    <td>${item?.REQUESTOR || `--`}</td>
                    <td>${item['DATE RECEIVED'] ? formatDate(item['DATE RECEIVED']) : `--`}</td>
                    <td>${item?.dueDate ? formatDate(item.dueDate, true) : `--`}</td>
                    <td class="queue-position"><span class="queue-position-count">${item['QUEUE']}</span></td>
                    <td class="task-action"><button type="button" class="task-edit-btn">Edit</button></td>
                    </tr>`
                    taskList.append(taskItemTemplate)


                    queueList.append(`<option value="${pending + 1}">${pending + 1}</option>`)
                    pending++

               

                if (ForThisMonth(signUpDate, item['DATE RECEIVED'])) {

                    taskCategoryObj[item['CATEGORY']] ? taskCategoryObj[item['CATEGORY']]++ : taskCategoryObj[item['CATEGORY']] = 1

                    taskThisMonthCount++
                }



            })

            // update counts
            availableTaskCreditCount = maxRequest - taskThisMonthCount
            pendingCount.text(pending)
            activeCount.text(active)
            completedCount.text(completed)
            availableTaskCredit.text(maxRequest - taskThisMonthCount)
            $('.blog-upload-count').text(taskCategoryObj["Blog upload"])
            $('.new-page-count').text(taskCategoryObj["Create new page"])
            $('.page-update-count').text(taskCategoryObj["Edit existing page"])
            $('.other-count').text(taskCategoryObj["Other"])

            // select last queue num in form
            $('#taskOrder-form [name=queue-position]').append(`<option value="${pending + 1}" selected>${pending + 1}</option>`)

            $('.client-dashboard').removeClass('disabled')
            orderForm.removeClass('disabled')
        }


        function Loader(text) {
            let loaderEL = $('.loader')
            if (text) {
                loaderEL.find('.loader-text').text(text)
            }

            return ({
                Open: () => {
                    loaderEL[0].showModal()
                },
                Close: () => {
                    loaderEL[0].close()
                }
            })
        }


        function ForThisMonth(dateSignUp, date) {
            
            let dateStarted = new Date(dateSignUp)
            let dayStarted = dateStarted.getDate()
            let monthToCheck = currentDate.getMonth()

            if (dayStarted > currentDate.getDate) {
                monthToCheck = currentDate.getMonth() - 1
            }
            let coveredMonth = new Date(currentDate.getFullYear(), monthToCheck, dayStarted)
            let dateToCheck = new Date(date)
            if (dateToCheck > coveredMonth) return true
        }


        $('.logout-btn').on('click', () => {
           Logout()
        })

        $(document).on('click', '[data-app-btn="new_task"]', function (e) {
            e.preventDefault()
            taskOrderDialog[0].showModal()
        })

        $(document).on('click', '[data-dialog-close]', function () {
            $(this).closest('dialog')[0]?.close()
    
        })

        $(document).on('click', '[data-tab-btn]', function (e) {
            e.preventDefault()
            const $this = $(this)
            const content_id = $this.attr('data-tab-btn')
            const $tab = $(this).closest('[data-tab]')
            const $tab_btns = $tab.find('[data-tab-btn]')
            const $tab_contents = $tab.find('[data-tab-content]')
            $tab_contents.removeClass('active')
            $tab_btns.removeClass('active')
            $(this).addClass('active')
            $(`[data-tab-content="${content_id}"]`).addClass('active')
        })

    })


 

    function formatDate(date, time = false) {
        if (typeof date === 'string') date = new Date(date);
      
        const dateFormatter = new Intl.DateTimeFormat('en-US', {
          month: 'long',
          day: '2-digit',
          year: 'numeric'
        });
      
        let dateParts = dateFormatter.formatToParts(date);
        let m = dateParts.find(p => p.type === 'month').value;
        let d = dateParts.find(p => p.type === 'day').value;
        let y = dateParts.find(p => p.type === 'year').value;
      
        let formatted = `<span>${m} ${d}</span><br>`;
      
        if (time) {
          let hours = date.getHours();
          let minutes = date.getMinutes().toString().padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12 || 12;
          formatted += `<span style="white-space:nowrap;">${hours}:${minutes} ${ampm}</span>`;
        }
      console.log(formatted)
        return formatted;
      }
      

    function Logout(){
        localStorage.removeItem('client')
        window.location.reload()
    }




    
    console.log('v1.3')





    // Landing page
    // 1 week
    // Web app
    // 1–3 months
    // Social graphics
    // 2 days
    // Web app updates
    // 1–6 hours
    // Website updates
    // 1–2 hours
    // Tech support
    // 1–3 hours

    function calculateDueDate(category, dateReceived) {
        const timeframes = {
          "landing page": { days: 7 },
          "web app": { months: 3 }, // average of 1–3 months
          "social graphics": { days: 2 },
          "web app updates": { hours: 6 }, // average of 1–6 hours
          "website updates": { hours: 2 }, // average of 1–2 hours
          "tech support": { hours: 3 }, // average of 1–3 hours
        };
      
        const timeframe = timeframes[category.toLowerCase()];
        if (!timeframe) return null;
      
        const due = new Date(dateReceived);
      
        if (timeframe.months) {
          due.setMonth(due.getMonth() + timeframe.months);
        } else if (timeframe.days) {
          due.setDate(due.getDate() + timeframe.days);
        } else if (timeframe.hours) {
          due.setTime(due.getTime() + timeframe.hours * 60 * 60 * 1000);
        }
      
        return due;
        
    }
      
    function processTaskQueue(queue) {
        let current = new Date(queue[0]['DATE RECEIVED']);
        const results = [];
      
        for (const task of queue) {
          const receivedDate = new Date(task['DATE RECEIVED']);
      
          // Ensure task doesn't start before it was received
          if (receivedDate > current) {
            current = receivedDate;
          }
      
          const due = calculateDueDate(task['CATEGORY'], current);
      
          results.push({
            ...task,
            start: new Date(current),
            dueDate: due ? due.toLocaleString() : null
          });
      
          if (due) {
            current = due;
          }
        }
      
        return results;
      }
      

      